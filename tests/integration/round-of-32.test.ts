import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { resetDbForTesting, setDbForTesting } from '@/db/client';
import { resolveAndPersistRoundOf32 } from '@/db/queries/round-of-32';

let testClient: Client;
const MIGRATIONS_DIR = resolve(process.cwd(), 'src/db/migrations');

async function runMigrations(client: Client) {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
    const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await client.execute(stmt);
    }
  }
}

async function truncate(client: Client) {
  await client.execute('DELETE FROM matches');
  await client.execute('DELETE FROM venues');
  await client.execute('DELETE FROM teams');
}

/** Group A の4チームと、順位が t1>t2>t3>t4 に確定する総当たり6試合（全 finished）を投入。 */
async function seedGroupA(client: Client) {
  await client.execute({
    sql: `INSERT INTO venues (id, stadium_name, city, state, country, country_code, country_flag)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['v1', 'Stadium', 'City', 'State', 'USA', 'USA', '🇺🇸'],
  });

  const teams: [string, string, string, string][] = [
    ['t1', 'チーム1', 'Team One', 'TG1'],
    ['t2', 'チーム2', 'Team Two', 'TG2'],
    ['t3', 'チーム3', 'Team Three', 'TG3'],
    ['t4', 'チーム4', 'Team Four', 'TG4'],
  ];
  for (const [id, ja, en, code] of teams) {
    await client.execute({
      sql: `INSERT INTO teams (id, name_ja, name_en, fifa_code, flag, group_name)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, ja, en, code, '🏳️', 'Group A'],
    });
  }

  // 各 [id, home, away, homeScore, awayScore]。勝者が常にホーム1-0。
  // 結果: t1=3勝(9), t2=2勝(6), t3=1勝(3), t4=0勝(0) で順位一意。
  const groupMatches: [number, string, string, number, number][] = [
    [1, 't1', 't2', 1, 0],
    [2, 't1', 't3', 1, 0],
    [3, 't1', 't4', 1, 0],
    [4, 't2', 't3', 1, 0],
    [5, 't2', 't4', 1, 0],
    [6, 't3', 't4', 1, 0],
  ];
  for (const [id, home, away, hs, as_] of groupMatches) {
    await client.execute({
      sql: `INSERT INTO matches
              (id, stage, match_date, venue_id, home_slot, away_slot, status,
               home_team_id, away_team_id, home_score, away_score, winner_team_id, group_letter)
            VALUES (?, 'group_stage', '2026-06-11', 'v1', '-', '-', 'finished', ?, ?, ?, ?, ?, 'A')`,
      args: [id, home, away, hs, as_, home], // 全試合ホーム 1-0 勝ち → winner=home
    });
  }

  // R32: Group A の 1位/2位スロットを持つ試合（入口は未確定）。
  await client.execute({
    sql: `INSERT INTO matches (id, stage, match_date, venue_id, home_slot, away_slot, status)
          VALUES (200, 'round_of_32', '2026-06-28', 'v1', 'Group A winners', 'Group A runners-up', 'scheduled')`,
  });
}

async function slotsOf(matchId: number): Promise<{ home: string | null; away: string | null }> {
  const r = await testClient.execute({
    sql: 'SELECT home_team_id, away_team_id FROM matches WHERE id = ?',
    args: [matchId],
  });
  const row = r.rows[0] as unknown as { home_team_id: string | null; away_team_id: string | null };
  return { home: row.home_team_id, away: row.away_team_id };
}

beforeAll(async () => {
  testClient = createClient({ url: ':memory:' });
  setDbForTesting(testClient);
  await runMigrations(testClient);
});

afterAll(() => {
  resetDbForTesting();
});

beforeEach(async () => {
  await truncate(testClient);
  await seedGroupA(testClient);
});

describe('resolveAndPersistRoundOf32', () => {
  it('グループ順位から R32 の winners(1位)/runners-up(2位) を埋める', async () => {
    const { updated } = await resolveAndPersistRoundOf32();
    expect(updated).toBe(2);

    const slots = await slotsOf(200);
    expect(slots.home).toBe('t1'); // Group A winners = 1位
    expect(slots.away).toBe('t2'); // Group A runners-up = 2位
  });

  it('冪等: 一度埋めた後の再実行は更新しない（updated=0）', async () => {
    await resolveAndPersistRoundOf32();
    const { updated } = await resolveAndPersistRoundOf32();
    expect(updated).toBe(0);
  });

  it('3位スロットは8グループ未満では埋めない（null のまま）', async () => {
    // third place スロットを持つ R32 試合を追加。Group A だけなので割当不能。
    await testClient.execute({
      sql: `INSERT INTO matches (id, stage, match_date, venue_id, home_slot, away_slot, status)
            VALUES (201, 'round_of_32', '2026-06-28', 'v1', 'Group A winners', 'Group A/B/C/D third place', 'scheduled')`,
    });

    await resolveAndPersistRoundOf32();

    const slots = await slotsOf(201);
    expect(slots.home).toBe('t1'); // winners は埋まる
    expect(slots.away).toBeNull(); // 3位は8グループ揃わないと割り当てない
  });
});
