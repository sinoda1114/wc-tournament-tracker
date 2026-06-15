'use server';

import { revalidatePath } from 'next/cache';

import { castCrowdVote, listTournamentMatches } from '@/db/queries';
import { hasKnockoutAccess } from '@/lib/billing/access';
import {
  aliveTeamIdsForStage,
  stageOpenForVoting,
  votableStage,
  type VotingStage,
} from '@/lib/crowd';
import { requireVoterId } from '@/lib/voter';

export type VoteActionResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'closed' | 'wrong_stage' | 'invalid_team' | 'locked' | 'auth' | 'paywall' | 'error';
      message: string;
    };

/** 決勝トーナメント系（KO）のステージ。これらの投票は entitlement（買い切り）ゲートの対象。 */
const KNOCKOUT_STAGES: readonly VotingStage[] = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'final',
];

function isKnockoutStage(stage: VotingStage): boolean {
  return KNOCKOUT_STAGES.includes(stage);
}

/**
 * 「みんなの予想」へ1票投じる。サーバ側で現在ステージ・締切（次ステージ開始）・候補・重複を
 * 再検証してから保存する（クライアントの値は信用しない）。成功で /prediction を再生成。
 *
 * 投票ライフサイクル: 各ステージは「出場確定で open → 次ステージ開始で締切（closed）→ 全試合終了で
 * archived（履歴）」で毎ラウンド回る。投票を受け付けるのは open のステージのみ。
 */
export async function castVoteAction(
  stage: string,
  teamId: string,
): Promise<VoteActionResult> {
  try {
    const matches = await listTournamentMatches();
    const now = new Date();
    const current = votableStage(matches, now);

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
    // 締切（初戦KO時刻）後の二重チェック。クライアントが古い open 状態を握っていても弾く。
    if (!stageOpenForVoting(matches, current, now)) {
      return {
        ok: false,
        reason: 'closed',
        message: 'このステージの投票は締め切られました。',
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

    // 決勝トーナメント（KO）ステージの投票は課金壁の対象。サーバ側で fail-closed に
    // 再判定する（PaywallLock を迂回した API 直叩きでの詐称を許さない）。無料期間中・購入済み・
    // 72h救済中は解放、それ以外（決勝T突入後の未購入）は拒否。group_stage は無料（T-51）。
    if (isKnockoutStage(current) && !(await hasKnockoutAccess())) {
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
