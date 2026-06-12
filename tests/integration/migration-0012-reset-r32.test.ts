/**
 * T-45 / migration 0012: 誤投入された Round of 32 の実チームを NULL へ是正する
 * migration の挙動を検証する。
 *
 * 検証観点:
 *  1. 実チーム ID が入った R32 行が NULL（プレースホルダ表示状態）へ戻る。
 *  2. home_slot / away_slot がグループ枠ラベルへ是正される（formatSlotLabel が
 *     「グループX 1位/2位」を出せる正規表記）。
 *  3. グループ試合 (id 1-72) と R16 以降 (id 89-104) は対象外（不可侵）。
 *  4. 冪等: 再適用しても結果が変わらない。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = resolve(process.cwd(), 'src/db/migrations');
const TARGET_MIGRATION = '0012_reset_round_of_32_slots.sql';

let client: Client;

async function execSqlFile(file: string) {
  const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
  const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
}

/** 0001..0011 を流して matches 等のスキーマを用意する（0012 は別途流す）。 */
async function runSchemaMigrations() {
  const { readdirSync } = await import('node:fs');
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && f < TARGET_MIGRATION)
    .sort();
  for (const file of files) {
    await execSqlFile(file);
  }
}

async function insertMatch(opts: {
  id: number;
  stage: string;
  homeSlot: string;
  awaySlot: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
}) {
  await client.execute({
    sql: `INSERT INTO matches
            (id, stage, match_date, venue_id, home_slot, away_slot, status, home_team_id, away_team_id)
          VALUES (?, ?, '2026-06-28', 'v1', ?, ?, 'scheduled', ?, ?)`,
    args: [opts.id, opts.stage, opts.homeSlot, opts.awaySlot, opts.homeTeamId, opts.awayTeamId],
  });
}

async function readMatch(id: number) {
  const r = await client.execute({
    sql: `SELECT home_team_id, away_team_id, home_slot, away_slot, status FROM matches WHERE id = ?`,
    args: [id],
  });
  return r.rows[0] as unknown as {
    home_team_id: string | null;
    away_team_id: string | null;
    home_slot: string;
    away_slot: string;
    status: string;
  };
}

beforeAll(async () => {
  client = createClient({ url: ':memory:' });
  await runSchemaMigrations();
});

afterAll(() => {
  client.close();
});

async function seedFixtures() {
  await client.execute({
    sql: `INSERT INTO venues (id, stadium_name, city, state, country, country_code, country_flag)
          VALUES ('v1', 'Stadium', 'City', 'State', 'USA', 'USA', '🇺🇸')`,
  });
  const teams: [string, string][] = [
    ['cote_divoire', 'コートジボワール'],
    ['china', '中国'],
    ['france', 'フランス'],
    ['japan', '日本'],
    ['mexico', 'メキシコ'],
    ['usa', 'アメリカ'],
  ];
  for (const [id, ja] of teams) {
    await client.execute({
      sql: `INSERT INTO teams (id, name_ja, name_en, fifa_code, flag, group_name)
            VALUES (?, ?, ?, ?, '🏳️', 'Group A')`,
      args: [id, ja, id, id.slice(0, 3).toUpperCase()],
    });
  }
}

beforeEach(async () => {
  await client.execute('DELETE FROM matches');
  await client.execute('DELETE FROM teams');
  await client.execute('DELETE FROM venues');
  await seedFixtures();

  // 事故状態の再現: R32 (73) に実チーム ID が入っている＋ slot ラベルも崩れている。
  await insertMatch({
    id: 73,
    stage: 'round_of_32',
    homeSlot: 'TBD',
    awaySlot: 'TBD',
    homeTeamId: 'cote_divoire',
    awayTeamId: 'china',
  });
  // 3位枠を持つ R32 (74)。
  await insertMatch({
    id: 74,
    stage: 'round_of_32',
    homeSlot: 'wrong',
    awaySlot: 'wrong',
    homeTeamId: 'france',
    awayTeamId: 'japan',
  });
  // 不可侵: グループ試合（確定済みの実チームは残す）。
  await insertMatch({
    id: 1,
    stage: 'group_stage',
    homeSlot: 'A1',
    awaySlot: 'A2',
    homeTeamId: 'mexico',
    awayTeamId: 'usa',
  });
  // 不可侵: R16（勝者伝播は別管理）。
  await insertMatch({
    id: 89,
    stage: 'round_of_16',
    homeSlot: 'Winner match 73',
    awaySlot: 'Winner match 74',
    homeTeamId: null,
    awayTeamId: null,
  });
});

describe('migration 0012: R32 を確定前プレースホルダへ是正', () => {
  it('R32 の実チーム ID を NULL 化し、slot ラベルを是正する', async () => {
    await execSqlFile(TARGET_MIGRATION);

    const m73 = await readMatch(73);
    expect(m73.home_team_id).toBeNull();
    expect(m73.away_team_id).toBeNull();
    expect(m73.home_slot).toBe('Group A runners-up');
    expect(m73.away_slot).toBe('Group B runners-up');

    const m74 = await readMatch(74);
    expect(m74.home_team_id).toBeNull();
    expect(m74.away_team_id).toBeNull();
    expect(m74.home_slot).toBe('Group E winners');
    expect(m74.away_slot).toBe('Group A/B/C/D/F third place');
  });

  it('グループ試合 (id 1-72) と R16 以降 (id 89-104) は不可侵', async () => {
    await execSqlFile(TARGET_MIGRATION);

    const group = await readMatch(1);
    expect(group.home_team_id).toBe('mexico');
    expect(group.away_team_id).toBe('usa');

    const r16 = await readMatch(89);
    expect(r16.home_slot).toBe('Winner match 73');
    expect(r16.away_slot).toBe('Winner match 74');
  });

  it('冪等: 再適用しても結果が変わらない', async () => {
    await execSqlFile(TARGET_MIGRATION);
    await execSqlFile(TARGET_MIGRATION);

    const m73 = await readMatch(73);
    expect(m73.home_team_id).toBeNull();
    expect(m73.home_slot).toBe('Group A runners-up');
    expect(m73.away_slot).toBe('Group B runners-up');
  });
});
