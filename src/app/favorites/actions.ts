'use server';

import { auth } from '@clerk/nextjs/server';

import { getUserFavorites, setUserFavorites } from '@/db/queries';
import { hasKnockoutAccess } from '@/lib/billing/access';
import { mergeFavoriteCodes } from '@/lib/favorites';

/**
 * ログインユーザーのお気に入りを保存する（端末間同期の書き込み側）。
 * クライアントは常に全件を送る。未ログインなら no-op（クライアントは localStorage のみで動く）。
 */
export async function saveFavoritesAction(codes: string[]): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId) return { ok: false };
  // 決勝T課金壁（T-68 面④）の fail-closed 再チェック。UIゲートに依存せず、書き込み直前に
  // サーバ側でも必ず再判定する（未購入×決勝T期間ならクライアント経由の書き込みでも拒否）。
  if (!(await hasKnockoutAccess())) return { ok: false };
  try {
    await setUserFavorites(userId, codes);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * 初回ログイン/マウント時の同期。サーバ側の保存分とクライアントの localStorage 分を
 * マージして永続化し、マージ後の全件を返す（端末間で和集合になる）。
 * 未ログインなら受け取ったローカル分をそのまま返す。
 */
export async function syncFavoritesAction(localCodes: string[]): Promise<{ codes: string[] }> {
  const { userId } = await auth();
  if (!userId) return { codes: localCodes };
  // 決勝T課金壁（T-68 面④）の fail-closed 再チェック。お気に入りの書き込み経路は
  // saveFavoritesAction だけでなく、この同期マージ書き戻しも該当する。未購入×決勝T期間では
  // どちらの経路でもサーバ永続化を行わない（saveFavoritesAction と同一境界で迂回を塞ぐ）。
  // 書き戻さず受け取ったローカル分をそのまま返すので、データ消失もログアウト挙動の変化もない。
  if (!(await hasKnockoutAccess())) return { codes: localCodes };
  try {
    const remote = await getUserFavorites(userId);
    const merged = mergeFavoriteCodes(remote, localCodes);
    // マージで増えた場合のみ書き戻す（不要な書き込みを避ける）。
    if (merged.length !== remote.length) {
      await setUserFavorites(userId, merged);
    }
    return { codes: merged };
  } catch {
    return { codes: localCodes };
  }
}
