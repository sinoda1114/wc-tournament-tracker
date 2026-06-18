'use server';

import { auth } from '@clerk/nextjs/server';

import {
  addUserFavorite,
  getUserFavorites,
  removeUserFavorite,
  setUserFavorites,
} from '@/db/queries';
import { hasKnockoutAccess } from '@/lib/billing/access';
import { mergeFavoriteCodes } from '@/lib/favorites';

/**
 * 課金壁（T-68 面④）の fail-closed 共通チェック。
 * 未ログイン or 未購入×決勝T期間なら false（書き込み禁止）。UIゲートに依存せず毎回サーバで再判定する。
 */
async function canWriteFavorites(): Promise<{ ok: boolean; userId: string | null }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, userId: null };
  if (!(await hasKnockoutAccess())) return { ok: false, userId };
  return { ok: true, userId };
}

/**
 * お気に入りを1件追加する（端末間同期の単品デルタ）。
 * 全件上書きしないので、他端末で消した別コードを巻き戻さない（蘇生防止）。
 */
export async function addFavoriteAction(code: string): Promise<{ ok: boolean }> {
  const { ok, userId } = await canWriteFavorites();
  if (!ok || !userId) return { ok: false };
  try {
    await addUserFavorite(userId, code);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * お気に入りを1件削除する（端末間同期の単品デルタ）。
 * その1コードだけ消すので、他端末の追加分を巻き戻さない。
 */
export async function removeFavoriteAction(code: string): Promise<{ ok: boolean }> {
  const { ok, userId } = await canWriteFavorites();
  if (!ok || !userId) return { ok: false };
  try {
    await removeUserFavorite(userId, code);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * 全件置換（「すべて解除」など、端末の意思で全体を上書きする操作専用）。
 * 通常のトグルは add/remove の単品デルタを使う（全件上書きは古い端末が削除を巻き戻すため）。
 */
export async function saveFavoritesAction(codes: string[]): Promise<{ ok: boolean }> {
  const { ok, userId } = await canWriteFavorites();
  if (!ok || !userId) return { ok: false };
  try {
    await setUserFavorites(userId, codes);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * 端末同期：**サーバ（user_favorites）を正**として現在の全件を返す。
 *
 * - 通常のロード/再取得（`anonAdds` 空）: サーバ状態をそのまま返す＝サーバ権威。
 *   端末ローカルの古いキャッシュとは**和集合しない**（他端末の削除が蘇る経路を断つ）。
 * - 初回ログイン等で `anonAdds`（ログアウト中に付けた★）がある場合のみ、それを**加算**して
 *   から返す（加算のみ＝他端末の削除を蘇らせない）。
 * - 未ログイン: 受け取った anonAdds をそのまま返す（localStorage のみで動作）。
 * - 未購入×決勝T期間（fail-closed）: 書き込まず anonAdds をそのまま返す（DB に触れない）。
 */
export async function syncFavoritesAction(anonAdds: string[]): Promise<{ codes: string[] }> {
  const { userId } = await auth();
  if (!userId) return { codes: anonAdds };
  // 書き込みは課金壁の対象。アクセス不可なら DB に触れず受け取った分をそのまま返す（既存挙動を維持）。
  if (!(await hasKnockoutAccess())) return { codes: anonAdds };
  try {
    const remote = await getUserFavorites(userId);
    if (anonAdds.length === 0) return { codes: remote }; // サーバ権威：そのまま採用。
    const merged = mergeFavoriteCodes(remote, anonAdds); // 加算のみ（ログアウト中の★を救済）。
    if (merged.length !== remote.length) {
      await setUserFavorites(userId, merged);
    }
    return { codes: merged };
  } catch {
    return { codes: anonAdds };
  }
}
