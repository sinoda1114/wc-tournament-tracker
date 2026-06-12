import { VOTING_STAGES, type VotingStage } from '@/lib/crowd';

import { getDb } from './client';

const db = () => getDb();

/** 渡された文字列が投票ステージ（VOTING_STAGES）か。 */
export function isVotingStage(stage: string): stage is VotingStage {
  return (VOTING_STAGES as readonly string[]).includes(stage);
}

/**
 * **操作中の管理者自身（voter_id 一致）** の「みんなの予想」票をすべて削除する。
 * 戻り値は削除件数。
 *
 * 安全設計（重要）: リセットは必ず `voter_id` で限定し、**他ユーザーの票には一切触れない**。
 * 「全ユーザーの票を消す」機能は意図的に持たない（誤操作で本番の全投票が飛ぶ事故を構造的に防ぐ）。
 * SQL は必ずパラメタライズド（文字列連結しない）。
 */
export async function deleteMyCrowdVotes(voterId: string): Promise<number> {
  const result = await db().execute({
    sql: 'DELETE FROM crowd_votes WHERE voter_id = ?',
    args: [voterId],
  });
  return result.rowsAffected;
}

/**
 * **操作中の管理者自身（voter_id 一致）** の、指定ステージの票だけ削除する。
 * stage は VOTING_STAGES に限定（未知値は弾く）。他ユーザーの票には触れない。
 */
export async function deleteMyCrowdVoteByStage(
  voterId: string,
  stage: string,
): Promise<number> {
  if (!isVotingStage(stage)) {
    throw new Error(`不正なステージです: ${stage}`);
  }
  const result = await db().execute({
    sql: 'DELETE FROM crowd_votes WHERE voter_id = ? AND stage = ?',
    args: [voterId, stage],
  });
  return result.rowsAffected;
}
