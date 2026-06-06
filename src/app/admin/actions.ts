'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
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
import { checkRateLimit } from '@/lib/rate-limit';

/** プロキシ経由のクライアント IP を推定する（Vercel は x-forwarded-for を付与）。 */
function clientIpFrom(h: Headers): string {
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return h.get('x-real-ip') ?? 'unknown';
}

export async function loginAdminAction(password: string) {
  // 総当たり緩和: IP ごとに 60 秒で 5 回まで（ベストエフォート・インメモリ）。
  const ip = clientIpFrom(await headers());
  const limit = checkRateLimit(`admin-login:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    const seconds = Math.ceil(limit.retryAfterMs / 1000);
    return {
      ok: false as const,
      message: `試行回数が多すぎます。約${seconds}秒後にもう一度お試しください`,
    };
  }

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
