/**
 * migrate ランナーのトランザクション化（T-74）の回帰防止テスト。
 *
 * 背景:
 *  - 旧 `scripts/migrate.ts` は 1 マイグレーション内の各文をトランザクション無しで
 *    逐次 execute していた。テーブル再作成系（CREATE NEW → INSERT SELECT → DROP OLD →
 *    RENAME → 子テーブル復元）が途中で失敗するとスキーマが半壊し、本番 DB では事故になる。
 *  - 対策として各マイグレーションを `applyMigrationAtomically()` で 1 トランザクション
 *    （libSQL `batch(stmts, 'write')`）として原子適用するようにした。
 *
 * 本テストは **後半をわざと失敗させるマイグレーション** を実ランナー関数に流し、
 *  1. 前半の DDL/DML も巻き戻る（テーブルが作られない / データが変わらない）
 *  2. `_migrations` への適用記録も行われない（適用と記録が不可分）
 * ことをアサートする。SQLite/libSQL では DDL もトランザクショナルに巻き戻ることが前提で、
 * その前提が libSQL で成り立つことをここで担保する。
 */
import { createClient, type Client } from '@libsql/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrationAtomically } from '../../scripts/migrate';
import { resetDbForTesting, setDbForTesting } from '../../src/db/client';

let client: Client;

beforeEach(async () => {
  client = createClient({ url: ':memory:' });
  // ランナーの getDb() がこの :memory: クライアントを返すようにする。
  setDbForTesting(client);
  // ランナー本体と同様に適用記録テーブルを用意。
  await client.execute(`
    CREATE TABLE _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);
});

afterEach(() => {
  client.close();
  resetDbForTesting();
});

async function migrationApplied(name: string): Promise<boolean> {
  const r = await client.execute({
    sql: 'SELECT 1 FROM _migrations WHERE name = ?',
    args: [name],
  });
  return r.rows.length > 0;
}

async function tableExists(name: string): Promise<boolean> {
  const r = await client.execute({
    sql: `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`,
    args: [name],
  });
  return r.rows.length > 0;
}

describe('applyMigrationAtomically — 途中失敗で前半も巻き戻る', () => {
  it('後半の文が失敗すると、前半で作ったテーブルも作られない（DDL ロールバック）', async () => {
    const file = '9991_failing_ddl.sql';
    const statements = [
      'CREATE TABLE atomic_probe (id INTEGER PRIMARY KEY, label TEXT)',
      "INSERT INTO atomic_probe (id, label) VALUES (1, 'before-failure')",
      // 存在しないテーブルへの INSERT で失敗させる。
      "INSERT INTO does_not_exist (x) VALUES (1)",
    ];

    await expect(applyMigrationAtomically(file, statements)).rejects.toThrow();

    // 前半の CREATE TABLE も巻き戻り、テーブル自体が存在しない。
    expect(await tableExists('atomic_probe')).toBe(false);
    // 適用記録も入っていない（適用と記録が不可分）。
    expect(await migrationApplied(file)).toBe(false);
  });

  it('既存データへの更新も、後半失敗で元の値に巻き戻る（DML ロールバック）', async () => {
    await client.execute('CREATE TABLE counters (id INTEGER PRIMARY KEY, n INTEGER)');
    await client.execute("INSERT INTO counters (id, n) VALUES (1, 10)");

    const file = '9992_failing_dml.sql';
    const statements = [
      'UPDATE counters SET n = 99 WHERE id = 1',
      "INSERT INTO does_not_exist (x) VALUES (1)", // 失敗
    ];

    await expect(applyMigrationAtomically(file, statements)).rejects.toThrow();

    const row = await client.execute('SELECT n FROM counters WHERE id = 1');
    expect(Number(row.rows[0].n)).toBe(10); // 99 に変わらず元のまま
    expect(await migrationApplied(file)).toBe(false);
  });

  it('全文成功すると適用記録も同一トランザクションで入る（正常系の不可分性）', async () => {
    const file = '9993_ok.sql';
    const statements = [
      'CREATE TABLE ok_probe (id INTEGER PRIMARY KEY, v TEXT)',
      "INSERT INTO ok_probe (id, v) VALUES (1, 'kept')",
    ];

    await applyMigrationAtomically(file, statements);

    expect(await tableExists('ok_probe')).toBe(true);
    const row = await client.execute('SELECT v FROM ok_probe WHERE id = 1');
    expect(row.rows[0].v).toBe('kept');
    // 適用記録が batch 内で入っている。
    expect(await migrationApplied(file)).toBe(true);
  });
});
