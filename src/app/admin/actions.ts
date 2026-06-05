'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  updateMatchResult,
  type UpdateMatchResultInput,
} from '@/db/queries';
import {
  ADMIN_SESSION_COOKIE,
  isAdminAuthenticated,
  isValidAdminPassword,
} from '@/lib/auth';

export async function loginAdminAction(password: string) {
  if (!isValidAdminPassword(password)) {
    return { ok: false as const, message: 'パスワードが正しくありません' };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, password, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  redirect('/admin');
}

export async function logoutAdminAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect('/admin/login');
}

export async function updateAdminMatchAction(
  input: UpdateMatchResultInput,
) {
  if (!(await isAdminAuthenticated())) {
    return { ok: false as const, message: '認証が必要です' };
  }

  try {
    await updateMatchResult(input);
    revalidatePath('/');
    revalidatePath('/prediction');
    revalidatePath(`/matches/${input.matchId}`);
    revalidatePath('/admin');
    revalidatePath(`/admin/matches/${input.matchId}`);
    return { ok: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '更新に失敗しました';
    return { ok: false as const, message };
  }
}
