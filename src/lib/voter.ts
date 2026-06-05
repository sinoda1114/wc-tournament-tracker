import { randomUUID } from 'node:crypto';

import { cookies } from 'next/headers';

/** 匿名投票者IDを保持する cookie 名。 */
export const VOTER_COOKIE = 'wc_voter_id';

/** cookie 有効期限（1年）。 */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * 既存の匿名投票者IDを読む（無ければ null）。RSC のレンダリング中でも呼べる。
 * 将来 Google 認証を入れたら「ログイン中はアカウントID」を優先して返すよう拡張する。
 */
export async function readVoterId(): Promise<string | null> {
  const store = await cookies();
  return store.get(VOTER_COOKIE)?.value ?? null;
}

/**
 * 匿名投票者IDを確実に得る。無ければ UUID を発行して httpOnly cookie に保存する。
 * cookie を書くため **Server Action / Route Handler 内でのみ**呼ぶこと。
 */
export async function ensureVoterId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(VOTER_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  store.set(VOTER_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  return id;
}
