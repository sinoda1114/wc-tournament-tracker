import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { resetDbForTesting, setDbForTesting } from '@/db/client';
import {
  getMatchDetail,
  listTournamentMatches,
  updateMatchResult,
} from '@/db/queries';

let testClient: Client;

const MIGRATIONS_DIR = resolve(process.cwd(), 'src/db/migrations');

async function runMigrations(client: Client) {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await client.execute(stmt);
    }
  }
}

async function truncate(client: Client) {
  await client.execute('DELETE FROM bracket_edges');
  await client.execute('DELETE FROM matches');
  await client.execute('DELETE FROM venues');
  await client.execute('DELETE FROM teams');
}

async function insertFixtures(client: Client) {
  await client.execute({
    sql: `INSERT INTO venues (id, stadium_name, city, state, country, country_code, country_flag)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['v1', 'Stadium', 'City', 'State', 'USA', 'USA', '🇺🇸'],
  });

  const teams: [string, string, string, string, string][] = [
    ['jpn', '日本', 'Japan', 'JPN', '🇯🇵'],
    ['arg', 'アルゼンチン', 'Argentina', 'ARG', '🇦🇷'],
    ['bra', 'ブラジル', 'Brazil', 'BRA', '🇧🇷'],
    ['fra', 'フランス', 'France', 'FRA', '🇫🇷'],
  ];

  for (const [id, nameJa, nameEn, code, flag] of teams) {
    await client.execute({
      sql: `INSERT INTO teams (id, name_ja, name_en, fifa_code, flag, group_name)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, nameJa, nameEn, code, flag, 'Group A'],
    });
  }

  await client.execute({
    sql: `INSERT INTO matches (id, stage, match_date, venue_id, home_slot, away_slot, status, home_team_id, away_team_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [101, 'semi_final', '2026-07-14', 'v1', 'Winner match 97', 'Winner match 98', 'scheduled', 'jpn', 'arg'],
  });

  await client.execute({
    sql: `INSERT INTO matches (id, stage, match_date, venue_id, home_slot, away_slot, status, home_team_id, away_team_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [102, 'semi_final', '2026-07-15', 'v1', 'Winner match 99', 'Winner match 100', 'scheduled', 'bra', 'fra'],
  });

  await client.execute({
    sql: `INSERT INTO matches (id, stage, match_date, venue_id, home_slot, away_slot, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [103, 'third_place', '2026-07-18', 'v1', 'Runner-up match 101', 'Runner-up match 102', 'scheduled'],
  });

  await client.execute({
    sql: `INSERT INTO matches (id, stage, match_date, venue_id, home_slot, away_slot, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [104, 'final', '2026-07-19', 'v1', 'Winner match 101', 'Winner match 102', 'scheduled'],
  });

  const edges: [number, 'winner' | 'loser', number, 'home' | 'away'][] = [
    [101, 'winner', 104, 'home'],
    [102, 'winner', 104, 'away'],
    [101, 'loser', 103, 'home'],
    [102, 'loser', 103, 'away'],
  ];

  for (const [fm, fr, tm, ts] of edges) {
    await client.execute({
      sql: `INSERT INTO bracket_edges (from_match_id, from_result, to_match_id, to_slot)
            VALUES (?, ?, ?, ?)`,
      args: [fm, fr, tm, ts],
    });
  }
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
  await insertFixtures(testClient);
});

describe('listTournamentMatches', () => {
  it('returns matches with joined venue and team data', async () => {
    const matches = await listTournamentMatches();

    expect(matches).toHaveLength(4);

    const m101 = matches.find((m) => m.id === 101);
    expect(m101?.homeTeam?.nameJa).toBe('日本');
    expect(m101?.venue.stadiumName).toBe('Stadium');
  });
});

describe('updateMatchResult', () => {
  it('saves score and auto-resolves winner when scores differ', async () => {
    const result = await updateMatchResult({
      matchId: 101,
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
    });

    expect(result?.winnerTeamId).toBe('jpn');
    expect(result?.homeScore).toBe(2);
  });

  it('propagates winner of M101 to M104 home', async () => {
    await updateMatchResult({
      matchId: 101,
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
    });

    const m104 = await getMatchDetail(104);
    expect(m104?.homeTeamId).toBe('jpn');
    expect(m104?.awayTeamId).toBeNull();
  });

  it('propagates loser of M101 to M103 home (3rd place match)', async () => {
    await updateMatchResult({
      matchId: 101,
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
    });

    const m103 = await getMatchDetail(103);
    expect(m103?.homeTeamId).toBe('arg');
  });

  it('propagates both finals when M101 and M102 are finished', async () => {
    await updateMatchResult({
      matchId: 101,
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
    });
    await updateMatchResult({
      matchId: 102,
      homeScore: 0,
      awayScore: 3,
      status: 'finished',
    });

    const m104 = await getMatchDetail(104);
    const m103 = await getMatchDetail(103);

    expect(m104?.homeTeamId).toBe('jpn');
    expect(m104?.awayTeamId).toBe('fra');
    expect(m103?.homeTeamId).toBe('arg');
    expect(m103?.awayTeamId).toBe('bra');
  });

  it('rejects finished status without winner when scores are tied', async () => {
    await expect(
      updateMatchResult({
        matchId: 101,
        homeScore: 1,
        awayScore: 1,
        status: 'finished',
      }),
    ).rejects.toThrow();
  });

  it('honors explicit winnerTeamId override (PK shootout)', async () => {
    const result = await updateMatchResult({
      matchId: 101,
      homeScore: 1,
      awayScore: 1,
      winnerTeamId: 'arg',
      status: 'finished',
    });

    expect(result?.winnerTeamId).toBe('arg');

    const m104 = await getMatchDetail(104);
    expect(m104?.homeTeamId).toBe('arg');

    const m103 = await getMatchDetail(103);
    expect(m103?.homeTeamId).toBe('jpn');
  });

  it('overwrites previous propagation when result is re-edited', async () => {
    await updateMatchResult({
      matchId: 101,
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
    });

    await updateMatchResult({
      matchId: 101,
      homeScore: 0,
      awayScore: 3,
      status: 'finished',
    });

    const m104 = await getMatchDetail(104);
    const m103 = await getMatchDetail(103);

    expect(m104?.homeTeamId).toBe('arg');
    expect(m103?.homeTeamId).toBe('jpn');
  });
});
