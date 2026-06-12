import { createClient, type Client } from '@libsql/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { resetDbForTesting, setDbForTesting } from '@/db/client';
import { deleteAllCrowdVotes, deleteCrowdVotesByStage } from '@/db/crowd-admin';
import { castCrowdVote, listCrowdVotes } from '@/db/queries';

/**
 * T-47 ADMIN 投票リセットの削除スコープを固めるユニット。
 * in-memory libSQL に最小スキーマを作り、ステージ別削除が当該ステージのみ、
 * 全削除が全部を消すことを担保する（DELETE は文字列連結せずパラメタライズド）。
 */

let testClient: Client;

async function setupSchema(client: Client) {
  // crowd_votes が team_id で teams を参照するため、最小の teams も用意する。
  await client.execute(`
    CREATE TABLE teams (
      id TEXT PRIMARY KEY,
      name_ja TEXT NOT NULL,
      name_en TEXT NOT NULL,
      fifa_code TEXT NOT NULL,
      flag TEXT NOT NULL,
      group_name TEXT
    )
  `);
  await client.execute(`
    CREATE TABLE crowd_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      team_id TEXT NOT NULL REFERENCES teams(id) ON UPDATE CASCADE ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE (voter_id, stage)
    )
  `);
}

async function seedVotes(client: Client) {
  await client.execute(`DELETE FROM crowd_votes`);
  await client.execute(`DELETE FROM teams`);
  for (const id of ['jpn', 'arg', 'bra']) {
    await client.execute({
      sql: `INSERT INTO teams (id, name_ja, name_en, fifa_code, flag) VALUES (?, ?, ?, ?, ?)`,
      args: [id, id, id, id.toUpperCase(), '🏳️'],
    });
  }
  // group_stage に2票、round_of_32 に1票。
  await castCrowdVote({ voterId: 'v1', stage: 'group_stage', teamId: 'jpn' });
  await castCrowdVote({ voterId: 'v2', stage: 'group_stage', teamId: 'arg' });
  await castCrowdVote({ voterId: 'v1', stage: 'round_of_32', teamId: 'bra' });
}

beforeAll(async () => {
  testClient = createClient({ url: ':memory:' });
  setDbForTesting(testClient);
  await setupSchema(testClient);
});

afterAll(() => {
  resetDbForTesting();
});

beforeEach(async () => {
  await seedVotes(testClient);
});

describe('deleteCrowdVotesByStage（ステージ別リセット）', () => {
  it('指定ステージの票だけ削除し、他ステージは残す', async () => {
    const affected = await deleteCrowdVotesByStage('group_stage');

    expect(affected).toBe(2);
    const remaining = await listCrowdVotes();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ stage: 'round_of_32', teamId: 'bra' });
  });

  it('該当票が無いステージは0件削除（他に影響しない）', async () => {
    const affected = await deleteCrowdVotesByStage('final');

    expect(affected).toBe(0);
    expect(await listCrowdVotes()).toHaveLength(3);
  });

  it('未知/不正なステージは投票ステージでないため拒否（DELETE しない）', async () => {
    await expect(deleteCrowdVotesByStage('not_a_stage')).rejects.toThrow();
    expect(await listCrowdVotes()).toHaveLength(3);
  });
});

describe('deleteAllCrowdVotes（全リセット）', () => {
  it('全ての票を削除してまっさらにする', async () => {
    const affected = await deleteAllCrowdVotes();

    expect(affected).toBe(3);
    expect(await listCrowdVotes()).toHaveLength(0);
  });
});
