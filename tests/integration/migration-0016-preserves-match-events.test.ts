/**
 * migration 0016: 引き分け許可のための matches テーブル再作成で、
 * **match_events（得点/カード/交代の履歴）が cascade 削除されず保全される**ことを検証する。
 *
 * 背景（T-62 レビュー指摘・回帰防止）:
 *  - match_events.match_id は matches(id) ON DELETE CASCADE（0009）。
 *  - 0016 は 0003 のテーブル再作成パターンを踏襲するが、0003 当時は match_events が
 *    未存在だったため、退避対象に match_events を含めないと DROP TABLE matches の cascade で
 *    試合イベント履歴が全消失する。これを 0016 で退避→復元するようにした。
 *  - 本テストは **FK を ON** にして cascade を実際に発火させ、復元込みで履歴が残ることを担保する
 *    （FK OFF だと cascade が起きず、欠陥があってもテストが素通りしてしまうため）。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = resolve(process.cwd(), 'src/db/migrations');
const TARGET_MIGRATION = '0016_allow_group_stage_draw.sql';

let client: Client;

async function execSqlFile(file: string) {
  const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
}

/** 0001..0015 を流して matches / match_events 等のスキーマを用意する（0016 は別途流す）。 */
async function runSchemaMigrations() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && f < TARGET_MIGRATION)
    .sort();
  for (const file of files) {
    await execSqlFile(file);
  }
}

beforeAll(async () => {
  client = createClient({ url: ':memory:' });
  // cascade を実際に発火させるため FK を有効化（これが無いと欠陥を検出できない）。
  await client.execute('PRAGMA foreign_keys = ON');
  await runSchemaMigrations();

  // 親（venue / team / match）と、match に紐づく match_events を投入。
  await client.execute({
    sql: `INSERT INTO venues (id, stadium_name, city, state, country, country_code, country_flag)
          VALUES ('v1', 'Stadium', 'City', 'ST', 'USA', 'USA', '🇺🇸')`,
  });
  await client.execute({
    sql: `INSERT INTO teams (id, name_ja, name_en, fifa_code, flag, group_name)
          VALUES ('can', 'カナダ', 'Canada', 'CAN', '🇨🇦', 'Group B')`,
  });
  await client.execute({
    sql: `INSERT INTO matches (id, stage, match_date, venue_id, home_slot, away_slot, status, home_team_id)
          VALUES (3, 'group_stage', '2026-06-13', 'v1', '', '', 'scheduled', 'can')`,
  });
  await client.execute({
    sql: `INSERT INTO match_events (id, match_id, type, minute, team_id, player_name, source)
          VALUES (1, 3, 'goal', 78, 'can', 'Larin', 'auto')`,
  });
});

afterAll(() => {
  client.close();
});

describe('migration 0016 — match_events の保全', () => {
  it('0016 適用後も match_events が cascade 削除されず残る', async () => {
    // 適用前: イベント1件。
    const before = await client.execute('SELECT COUNT(*) AS c FROM match_events');
    expect(Number(before.rows[0].c)).toBe(1);

    // 0016（matches 再作成）を適用。
    await execSqlFile(TARGET_MIGRATION);

    // 適用後も同じイベントが残っていること（cascade で消えていない）。
    const after = await client.execute('SELECT match_id, player_name FROM match_events');
    expect(after.rows).toHaveLength(1);
    expect(Number(after.rows[0].match_id)).toBe(3);
    expect(after.rows[0].player_name).toBe('Larin');

    // matches 本体も残っていること（再作成が成功している）。
    const match = await client.execute('SELECT id FROM matches WHERE id = 3');
    expect(match.rows).toHaveLength(1);
  });

  it('0016 後はグループステージの引き分けを winner=null で保存できる（DB CHECK 緩和）', async () => {
    // 1-1 引き分け・winner なしで finished に更新できる（CHECK 違反にならない）。
    await client.execute({
      sql: `UPDATE matches SET home_score = 1, away_score = 1, winner_team_id = NULL, status = 'finished' WHERE id = 3`,
    });
    const row = await client.execute('SELECT status, winner_team_id FROM matches WHERE id = 3');
    expect(row.rows[0].status).toBe('finished');
    expect(row.rows[0].winner_team_id).toBeNull();
  });
});
