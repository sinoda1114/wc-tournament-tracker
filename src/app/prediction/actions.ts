'use server';

import { revalidatePath } from 'next/cache';

import { castCrowdVote, listTournamentMatches } from '@/db/queries';
import { aliveTeamIdsForStage, currentVotingStage } from '@/lib/crowd';
import { ensureVoterId } from '@/lib/voter';

export type VoteActionResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'closed' | 'wrong_stage' | 'invalid_team' | 'locked' | 'error';
      message: string;
    };

/**
 * 「みんなの予想」へ1票投じる。サーバ側で現在ステージ・候補・重複を再検証してから保存する
 * （クライアントの値は信用しない）。成功で /prediction を再生成。
 */
export async function castVoteAction(
  stage: string,
  teamId: string,
): Promise<VoteActionResult> {
  try {
    const matches = await listTournamentMatches();
    const current = currentVotingStage(matches);

    if (!current) {
      return { ok: false, reason: 'closed', message: '投票は終了しました。' };
    }
    if (stage !== current) {
      return {
        ok: false,
        reason: 'wrong_stage',
        message: 'ステージが更新されました。最新の状態で投票してください。',
      };
    }
    if (!aliveTeamIdsForStage(matches, current).includes(teamId)) {
      return { ok: false, reason: 'invalid_team', message: 'そのチームには投票できません。' };
    }

    const voterId = await ensureVoterId();
    const result = await castCrowdVote({ voterId, stage: current, teamId });
    if (result === 'locked') {
      return {
        ok: false,
        reason: 'locked',
        message: 'このステージはすでに投票済みです。',
      };
    }

    revalidatePath('/prediction');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '投票に失敗しました。';
    return { ok: false, reason: 'error', message };
  }
}
