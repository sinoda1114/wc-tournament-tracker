'use server';

import { revalidatePath } from 'next/cache';

import { castCrowdVote, listTournamentMatches } from '@/db/queries';
import { hasKnockoutAccess } from '@/lib/billing/access';
import { aliveTeamIdsForStage, currentVotingStage } from '@/lib/crowd';
import { requireVoterId } from '@/lib/voter';

export type VoteActionResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'closed' | 'wrong_stage' | 'invalid_team' | 'locked' | 'auth' | 'paywall' | 'error';
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

    // 投票はログイン必須。識別子は Clerk userId（端末をまたいで同一＝多重投票を防ぐ）。
    const voterId = await requireVoterId();
    if (!voterId) {
      return { ok: false, reason: 'auth', message: 'ログインすると投票できます。' };
    }

    // 決勝T関連ステージ（group_stage 以外）の投票は課金壁の対象。サーバ側で fail-closed に
    // 再判定する（PaywallLock を迂回した API 直叩きでの詐称を許さない）。無料期間中・購入済み・
    // 72h救済中は解放、それ以外（決勝T突入後の未購入）は拒否。
    if (current !== 'group_stage' && !(await hasKnockoutAccess())) {
      return {
        ok: false,
        reason: 'paywall',
        message: '決勝トーナメントの投票は購入後にご利用いただけます。',
      };
    }

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
