'use server';

import { revalidatePath } from 'next/cache';

import {
  deleteAllCrowdVotes,
  deleteCrowdVotesByStage,
  isVotingStage,
} from '@/db/crowd-admin';
import {
  createMatchEvent,
  deleteMatchEvent,
  updateMatchEvent,
} from '@/db/match-events';
import { updateMatchResult, type UpdateMatchResultInput } from '@/db/queries';
import { isAdmin } from '@/lib/auth';
import { STAGE_LABELS } from '@/lib/crowd';
import {
  matchEventCreateSchema,
  matchEventUpdateSchema,
  matchUpdateSchema,
} from '@/lib/validation';

export async function updateAdminMatchAction(input: UpdateMatchResultInput) {
  // 所有者（ADMIN_EMAILS 一致の Clerk ユーザー）以外は更新不可。
  if (!(await isAdmin())) {
    return { ok: false as const, message: '管理者権限が必要です' };
  }

  // クライアント由来の入力を DB 手前で検証（スコア範囲・ステータス enum 等）。
  const parsed = matchUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: '入力が不正です' };
  }

  try {
    await updateMatchResult(parsed.data);
    revalidatePath('/');
    revalidatePath('/prediction');
    revalidatePath(`/matches/${input.matchId}`);
    revalidatePath('/admin');
    revalidatePath(`/admin/matches/${input.matchId}`);
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新に失敗しました';
    return { ok: false as const, message };
  }
}

/**
 * 指定ステージの「みんなの予想」票をリセット（DELETE）。所有者のみ。
 * 運用テスト用：そのステージだけ消して再投票できるようにする。
 */
export async function resetCrowdVotesByStageAction(stage: string) {
  if (!(await isAdmin())) {
    return { ok: false as const, message: '管理者権限が必要です' };
  }
  if (!isVotingStage(stage)) {
    return { ok: false as const, message: '不正なステージです' };
  }
  try {
    const deleted = await deleteCrowdVotesByStage(stage);
    revalidatePath('/prediction');
    revalidatePath('/admin');
    return {
      ok: true as const,
      message: `${STAGE_LABELS[stage]}の投票を ${deleted} 件削除しました`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '投票リセットに失敗しました';
    return { ok: false as const, message };
  }
}

/**
 * 全ての「みんなの予想」票をリセット（DELETE）。所有者のみ。
 * まっさらにする最も破壊的な操作。UI 側で明示的な確認を必須にする。
 */
export async function resetAllCrowdVotesAction() {
  if (!(await isAdmin())) {
    return { ok: false as const, message: '管理者権限が必要です' };
  }
  try {
    const deleted = await deleteAllCrowdVotes();
    revalidatePath('/prediction');
    revalidatePath('/admin');
    return {
      ok: true as const,
      message: `全ての投票を ${deleted} 件削除しました`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '投票リセットに失敗しました';
    return { ok: false as const, message };
  }
}

/** 試合イベントを追加（手動・source='manual'）。所有者のみ。 */
export async function createMatchEventAction(input: unknown) {
  if (!(await isAdmin())) {
    return { ok: false as const, message: '管理者権限が必要です' };
  }
  const parsed = matchEventCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: '入力が不正です' };
  }
  await createMatchEvent(parsed.data);
  revalidatePath(`/matches/${parsed.data.matchId}`);
  revalidatePath(`/admin/matches/${parsed.data.matchId}`);
  return { ok: true as const };
}

/** 試合イベントを更新（手動行のみ）。所有者のみ。 */
export async function updateMatchEventAction(matchId: number, input: unknown) {
  if (!(await isAdmin())) {
    return { ok: false as const, message: '管理者権限が必要です' };
  }
  const parsed = matchEventUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: '入力が不正です' };
  }
  const { id, ...rest } = parsed.data;
  await updateMatchEvent(id, rest);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/admin/matches/${matchId}`);
  return { ok: true as const };
}

/** 試合イベントを削除（手動行のみ）。所有者のみ。 */
export async function deleteMatchEventAction(matchId: number, id: number) {
  if (!(await isAdmin())) {
    return { ok: false as const, message: '管理者権限が必要です' };
  }
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false as const, message: '不正なIDです' };
  }
  await deleteMatchEvent(id);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/admin/matches/${matchId}`);
  return { ok: true as const };
}
