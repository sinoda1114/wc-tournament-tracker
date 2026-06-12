'use server';

import { revalidatePath } from 'next/cache';

import {
  deleteMyCrowdVoteByStage,
  deleteMyCrowdVotes,
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
import { requireVoterId } from '@/lib/voter';
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
 * **自分（操作中の管理者）の** 投票をすべてリセット（DELETE）。所有者のみ。
 * 運用テスト用：自分のテスト票を消して再投票できるようにする。
 * 安全設計: voter_id で自分に限定し、他ユーザーの票には絶対に触れない。
 */
export async function resetMyCrowdVotesAction() {
  if (!(await isAdmin())) {
    return { ok: false as const, message: '管理者権限が必要です' };
  }
  const voterId = await requireVoterId();
  if (!voterId) {
    return { ok: false as const, message: 'ログインが必要です' };
  }
  try {
    const deleted = await deleteMyCrowdVotes(voterId);
    revalidatePath('/prediction');
    revalidatePath('/admin');
    return {
      ok: true as const,
      message: `自分の投票を ${deleted} 件削除しました`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '投票リセットに失敗しました';
    return { ok: false as const, message };
  }
}

/**
 * **自分（操作中の管理者）の** 指定ステージの投票だけリセット（DELETE）。所有者のみ。
 * 運用テスト用：自分のそのステージのテスト票だけ消して再投票できるようにする。
 * 安全設計: voter_id で自分に限定し、他ユーザーの票には絶対に触れない。
 */
export async function resetMyCrowdVoteByStageAction(stage: string) {
  if (!(await isAdmin())) {
    return { ok: false as const, message: '管理者権限が必要です' };
  }
  if (!isVotingStage(stage)) {
    return { ok: false as const, message: '不正なステージです' };
  }
  const voterId = await requireVoterId();
  if (!voterId) {
    return { ok: false as const, message: 'ログインが必要です' };
  }
  try {
    const deleted = await deleteMyCrowdVoteByStage(voterId, stage);
    revalidatePath('/prediction');
    revalidatePath('/admin');
    return {
      ok: true as const,
      message: `自分の${STAGE_LABELS[stage]}の投票を ${deleted} 件削除しました`,
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
