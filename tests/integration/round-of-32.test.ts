import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { resetDbForTesting, setDbForTesting } from '@/db/client';
import { resolveAndPersistRoundOf32 } from '@/db/queries/round-of-32';

let testClient: Client;
const MIGRATIONS_DIR = resolve(process.cwd(), 'src/db/migrations');

const ALL_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
type GroupLetter = (typeof ALL_GROUPS)[number];

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

async function ensureVenue(client: Client) {
  await client.execute({
    sql: `INSERT OR IGNORE INTO venues (id, stadium_name, city, state, country, country_code, country_flag)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['v1', 'Stadium', 'City', 'State', 'USA', 'USA', '🇺🇸'],
  });
}

let nextMatchId = 1;

/**
 * 1グループ（4チーム）と、順位が t1>t2>t3>t4 に一意確定する総当たり6試合を投入。
 * @param played true: 全6試合 finished（順位確定）/ false: 全6試合 scheduled（未消化）。
 */
async function seedGroup(client: Client, group: GroupLetter, played: boolean) {
  const ids = [1, 2, 3, 4].map((n) => `${group.toLowerCase()}${n}`);
  for (let i = 0; i < ids.length; i += 1) {
    await client.execute({
      sql: `INSERT INTO teams (id, name_ja, name_en, fifa_code, flag, group_name)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [ids[i], `チーム${ids[i]}`, `Team ${ids[i]}`, `${group}${i + 1}`, '🏳️', `Group ${group}`],
    });
  }

  // 各 [home, away]。勝者が常にホーム 1-0。t1=3勝, t2=2勝, t3=1勝, t4=0勝 で一意。
  const pairs: [string, string][] = [
    [ids[0], ids[1]],
    [ids[0], ids[2]],
    [ids[0], ids[3]],
    [ids[1], ids[2]],
    [ids[1], ids[3]],
    [ids[2], ids[3]],
  ];
  for (const [home, away] of pairs) {
    const id = nextMatchId;
    nextMatchId += 1;
    if (played) {
      await client.execute({
        sql: `INSERT INTO matches
                (id, stage, match_date, venue_id, home_slot, away_slot, status,
                 home_team_id, away_team_id, home_score, away_score, winner_team_id, group_letter)
              VALUES (?, 'group_stage', '2026-06-11', 'v1', '-', '-', 'finished', ?, ?, 1, 0, ?, ?)`,
        args: [id, home, away, home, group],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO matches
                (id, stage, match_date, venue_id, home_slot, away_slot, status,
                 home_team_id, away_team_id, group_letter)
              VALUES (?, 'group_stage', '2026-06-11', 'v1', '-', '-', 'scheduled', ?, ?, ?)`,
        args: [id, home, away, group],
      });
    }
  }
}

/** R32 試合（入口は未確定 = team_id NULL）を1件追加。 */
async function seedR32Match(
  client: Client,
  id: number,
  homeSlot: string,
  awaySlot: string,
) {
  await client.execute({
    sql: `INSERT INTO matches (id, stage, match_date, venue_id, home_slot, away_slot, status)
          VALUES (?, 'round_of_32', '2026-06-28', 'v1', ?, ?, 'scheduled')`,
    args: [id, homeSlot, awaySlot],
  });
}

/**
 * 12グループ全てを投入。`completedGroups` に含まれるグループだけ finished（順位確定）、
 * 残りは scheduled（未消化）。全組 played なら isGroupStageComplete=true。
 */
async function seedAllGroups(client: Client, completedGroups: readonly GroupLetter[]) {
  await ensureVenue(client);
  for (const g of ALL_GROUPS) {
    await seedGroup(client, g, completedGroups.includes(g));
  }
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
  nextMatchId = 1;
});

describe('resolveAndPersistRoundOf32', () => {
  it('全12組消化済みなら R32 の winners(1位)/runners-up(2位) を埋める', async () => {
    await seedAllGroups(testClient, ALL_GROUPS);
    // Group A の 1位/2位スロット試合。
    await seedR32Match(testClient, 200, 'Group A winners', 'Group A runners-up');

    const { updated } = await resolveAndPersistRoundOf32();
    expect(updated).toBe(2);

    const slots = await slotsOf(200);
    expect(slots.home).toBe('a1'); // Group A winners = 1位
    expect(slots.away).toBe('a2'); // Group A runners-up = 2位
  });

  it('冪等: 一度埋めた後の再実行は更新しない（updated=0）', async () => {
    await seedAllGroups(testClient, ALL_GROUPS);
    await seedR32Match(testClient, 200, 'Group A winners', 'Group A runners-up');

    await resolveAndPersistRoundOf32();
    const { updated } = await resolveAndPersistRoundOf32();
    expect(updated).toBe(0);
  });

  // ---- T-46: グループ未確定なら前倒し充填しない（確定ゲート） ----

  it('全組未消化（played=0）なら R32 入口を一切埋めない（updated=0・NULL のまま）', async () => {
    await seedAllGroups(testClient, []); // どのグループも未消化
    await seedR32Match(testClient, 200, 'Group A winners', 'Group A runners-up');

    const { updated } = await resolveAndPersistRoundOf32();
    expect(updated).toBe(0);

    const slots = await slotsOf(200);
    expect(slots.home).toBeNull();
    expect(slots.away).toBeNull();
  });

  it('一部グループだけ消化済み（A 組のみ）でも確定単位は全組なので埋めない', async () => {
    await seedAllGroups(testClient, ['A']); // A 組だけ finished、残りは scheduled
    await seedR32Match(testClient, 200, 'Group A winners', 'Group A runners-up');

    const { updated } = await resolveAndPersistRoundOf32();
    expect(updated).toBe(0);

    const slots = await slotsOf(200);
    // A 組は順位確定しているが、全組確定までは前倒し bind しない。
    expect(slots.home).toBeNull();
    expect(slots.away).toBeNull();
  });

  it('全12組消化済みなら third place スロットも実チームで埋まる', async () => {
    await seedAllGroups(testClient, ALL_GROUPS);
    // FIFA 公式の third-place ホスト試合 id=74（Group E winners / 3位）。
    // 3位割当は host 試合 id をキーにするため、実 id(74) を使う。
    await seedR32Match(testClient, 74, 'Group E winners', 'Group A/B/C/D/F third place');

    await resolveAndPersistRoundOf32();

    const slots = await slotsOf(74);
    expect(slots.home).toBe('e1'); // winners は埋まる
    expect(slots.away).not.toBeNull(); // 全組確定済みなので3位も割り当て済み
  });
});
