import { createClient, type Client } from '@libsql/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { resetDbForTesting, setDbForTesting } from '@/db/client';
import { deleteMyCrowdVoteByStage, deleteMyCrowdVotes } from '@/db/crowd-admin';
import { castCrowdVote, listCrowdVotes } from '@/db/queries';

/**
 * T-48 ADMIN 投票リセットの削除スコープを固めるユニット。
 * **安全要件**: リセットは必ず voter_id で自分に限定し、**他ユーザーの票には絶対に触れない**。
 * in-memory libSQL に最小スキーマを作り、自分の全削除・自分のステージ別削除が
 * 「自分の票だけ」を消すことを担保する（DELETE は文字列連結せずパラメタライズド）。
 */

let testClient: Client;

async function setupSchema(client: Client) {
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
  // v1（自分役）: group_stage/jpn と round_of_32/bra の2票。
  // v2（他ユーザー）: group_stage/arg の1票（これは絶対に消えてはいけない）。
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

describe('deleteMyCrowdVotes（自分の全投票リセット）', () => {
  it('自分(v1)の票だけ全部削除し、他ユーザー(v2)の票は残す', async () => {
    const affected = await deleteMyCrowdVotes('v1');

    expect(affected).toBe(2);
    const remaining = await listCrowdVotes();
    expect(remaining).toHaveLength(1);
    // v2 の group_stage 票は無傷。
    expect(remaining[0]).toMatchObject({ voterId: 'v2', stage: 'group_stage', teamId: 'arg' });
  });

  it('票が無い voter は0件削除（他ユーザーに影響しない）', async () => {
    const affected = await deleteMyCrowdVotes('nobody');

    expect(affected).toBe(0);
    expect(await listCrowdVotes()).toHaveLength(3);
  });
});

describe('deleteMyCrowdVoteByStage（自分の特定ステージのみ）', () => {
  it('自分(v1)の指定ステージの票だけ削除し、同ステージの他ユーザー(v2)は残す', async () => {
    const affected = await deleteMyCrowdVoteByStage('v1', 'group_stage');

    expect(affected).toBe(1);
    const remaining = await listCrowdVotes();
    // v1/round_of_32 と v2/group_stage は残る（同じ group_stage でも v2 は無傷）。
    expect(remaining).toHaveLength(2);
    expect(remaining.some((v) => v.voterId === 'v2' && v.stage === 'group_stage')).toBe(true);
    expect(remaining.some((v) => v.voterId === 'v1' && v.stage === 'round_of_32')).toBe(true);
    expect(remaining.some((v) => v.voterId === 'v1' && v.stage === 'group_stage')).toBe(false);
  });

  it('未知/不正なステージは拒否（DELETE しない）', async () => {
    await expect(deleteMyCrowdVoteByStage('v1', 'not_a_stage')).rejects.toThrow();
    expect(await listCrowdVotes()).toHaveLength(3);
  });
});
