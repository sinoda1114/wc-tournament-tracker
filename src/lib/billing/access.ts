import { auth, currentUser } from '@clerk/nextjs/server';

import { hasActiveEntitlement } from '@/db/queries/billing';
import {
  evaluateEntitlement,
  type EntitlementResult,
} from '@/lib/billing/entitlement';

/**
 * 課金壁のサーバ判定の入口（T-14）。Clerk（ログイン状態・登録日時）と DB（購入フラグ）を
 * 束ね、純関数 {@link evaluateEntitlement} に渡して「決勝T関連を見せてよいか」を返す。
 *
 * クライアントの申告値は一切使わない。RSC / サーバーアクションからのみ呼ぶこと。
 */

/**
 * 現在のリクエストのアクセス権を解決する。
 * - 未ログイン: 購入フラグ無し・登録日時 null（無料期間は通す／決勝T後は locked）。
 * - ログイン済み: DB の購入フラグ＋Clerk created_at で判定。
 */
export async function resolveAccess(now: Date = new Date()): Promise<EntitlementResult> {
  const { userId } = await auth();

  if (!userId) {
    return evaluateEntitlement({ now, purchased: false, clerkCreatedAtMs: null });
  }

  // 購入フラグ（DB）。例外時は fail-closed（未購入扱い）にする。
  let purchased = false;
  try {
    purchased = await hasActiveEntitlement(userId);
  } catch {
    purchased = false;
  }

  // Clerk のアカウント作成時刻（72h 救済の起点）。
  const user = await currentUser();
  const clerkCreatedAtMs = user?.createdAt ?? null;

  return evaluateEntitlement({ now, purchased, clerkCreatedAtMs });
}

/** 決勝T関連コンテンツへアクセス可能か（真偽のみ）。 */
export async function hasKnockoutAccess(now: Date = new Date()): Promise<boolean> {
  return (await resolveAccess(now)).hasAccess;
}
