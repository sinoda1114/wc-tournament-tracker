import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

/** 旧・匿名投票者IDを保持していた cookie 名（読み取りのみ。新規投票はログイン必須）。 */
export const VOTER_COOKIE = 'wc_voter_id';

/**
 * 投票者IDを読む（UI で「自分の票」を表示するため）。
 * ログイン中は **Clerk userId** を返す（端末をまたいで同一＝不正な多重投票を防ぐ）。
 * 未ログイン時は、過去に匿名投票した cookie があればそれを返す（後方互換の閲覧用）。
 * RSC のレンダリング中でも呼べる。
 */
export async function readVoterId(): Promise<string | null> {
  const { userId } = await auth();
  if (userId) return userId;
  const store = await cookies();
  return store.get(VOTER_COOKIE)?.value ?? null;
}

/**
 * 投票に使うアカウントIDを返す（Clerk userId）。未ログインなら null。
 * 投票はログイン必須にしたため、cookie によるID発行は廃止した。
 */
export async function requireVoterId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}
