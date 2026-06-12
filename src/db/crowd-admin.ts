import { VOTING_STAGES, type VotingStage } from '@/lib/crowd';

import { getDb } from './client';

const db = () => getDb();

/** 渡された文字列が投票ステージ（VOTING_STAGES）か。 */
export function isVotingStage(stage: string): stage is VotingStage {
  return (VOTING_STAGES as readonly string[]).includes(stage);
}

/**
 * 指定ステージの「みんなの予想」票をすべて削除する（ステージ別リセット）。
 * 戻り値は削除件数。stage は VOTING_STAGES に限定し、未知値は弾く（防御）。
 * SQL は必ずパラメタライズド（文字列連結しない）。
 */
export async function deleteCrowdVotesByStage(stage: string): Promise<number> {
  if (!isVotingStage(stage)) {
    throw new Error(`不正なステージです: ${stage}`);
  }
  const result = await db().execute({
    sql: 'DELETE FROM crowd_votes WHERE stage = ?',
    args: [stage],
  });
  return result.rowsAffected;
}

/**
 * すべての「みんなの予想」票を削除する（全リセット＝まっさら）。
 * 戻り値は削除件数。破壊的なので呼び出し側で admin ゲート＋確認を必須にする。
 */
export async function deleteAllCrowdVotes(): Promise<number> {
  const result = await db().execute({
    sql: 'DELETE FROM crowd_votes',
    args: [],
  });
  return result.rowsAffected;
}
