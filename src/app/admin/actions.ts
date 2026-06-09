'use server';

import { revalidatePath } from 'next/cache';

import { updateMatchResult, type UpdateMatchResultInput } from '@/db/queries';
import { isAdmin } from '@/lib/auth';
import { matchUpdateSchema } from '@/lib/validation';

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
