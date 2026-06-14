import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

import { getDb } from '../src/db/client';

const root = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(root, '../src/db/migrations');

async function ensureMigrationsTable() {
  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);
}

async function tableExists(name: string): Promise<boolean> {
  const result = await getDb().execute({
    sql: `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`,
    args: [name],
  });
  return result.rows.length > 0;
}

async function getExecutedNames(): Promise<Set<string>> {
  const result = await getDb().execute('SELECT name FROM _migrations');
  return new Set(result.rows.map((row) => (row as unknown as { name: string }).name));
}

async function recordMigration(name: string) {
  await getDb().execute({
    sql: 'INSERT INTO _migrations (name) VALUES (?)',
    args: [name],
  });
}

/**
 * 1 マイグレーションファイルを「全文 + 適用記録」を 1 トランザクションとして原子適用する。
 *
 * libSQL の `batch(stmts, 'write')` は配列全体を 1 トランザクションで実行し、
 * 1 文でも失敗すると全体をロールバックする（DDL も SQLite/libSQL ではトランザクショナルに
 * 巻き戻る）。テーブル再作成系（CREATE NEW → INSERT SELECT → DROP OLD → RENAME → 子テーブル復元）
 * のように複数 DDL/DML が連鎖するマイグレーションでも、途中失敗でスキーマが半壊しない。
 *
 * `INSERT INTO _migrations ...` も同一 batch に含めることで「適用」と「適用済み記録」を
 * 不可分にする（適用は成功したのに記録だけ漏れる/その逆を防ぐ）。
 */
export async function applyMigrationAtomically(file: string, statements: string[]) {
  await getDb().batch(
    [
      ...statements,
      { sql: 'INSERT INTO _migrations (name) VALUES (?)', args: [file] },
    ],
    'write',
  );
}

async function migrate() {
  await ensureMigrationsTable();

  const executed = await getExecutedNames();

  // 既存DB保護: _migrations が空でも、コアテーブルが既に存在する場合は
  // 0001_initial を実行済みとして記録する（CREATE TABLE IF NOT EXISTS でも
  // 安全に再実行できるが、運用ログの整合性のため明示的にスキップ扱いにする）。
  if (executed.size === 0) {
    const core = ['teams', 'venues', 'matches', 'bracket_edges'];
    const present = await Promise.all(core.map((t) => tableExists(t)));
    if (present.every(Boolean)) {
      await recordMigration('0001_initial.sql');
      executed.add('0001_initial.sql');
      console.log('Detected pre-existing core tables; marked 0001_initial.sql as executed');
    }
  }

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (executed.has(file)) {
      console.log(`Skip ${file} (already executed)`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    const statements = sql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    // 各マイグレーションを 1 トランザクションで原子適用する。
    // 途中で失敗してもスキーマ/データは適用前へ巻き戻り、半壊状態を残さない。
    await applyMigrationAtomically(file, statements);
    console.log(`Executed ${file}`);
  }

  console.log('Migration completed');
}

// 直接実行（npm run db:migrate / tsx scripts/migrate.ts）のときだけ走らせる。
// テストから applyMigrationAtomically を import しても本番 env への適用が
// 発火しないようにエントリポイントをガードする。
// 相対パス起動（tsx ./scripts/migrate.ts 等）でも判定が外れないよう、
// 双方を resolve() して絶対パスで比較する。
const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
const isDirectRun = entryPath === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  migrate().catch((error: unknown) => {
    console.error('Migration failed');
    console.error(error);
    process.exitCode = 1;
  });
}
