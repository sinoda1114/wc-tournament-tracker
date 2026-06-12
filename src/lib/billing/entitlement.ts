import { KNOCKOUT_START_UTC } from '@/lib/pricing';

/**
 * 課金壁（entitlement）の判定ロジック（純関数・サーバ専用 / T-14）。
 *
 * 方針（launch-monetization-plan 確定）— 日付ゲート方式:
 *  - グループステージ（〜JST 6/28・決勝T開始境界 {@link KNOCKOUT_START_UTC} 未満）は全員無料。
 *  - 決勝トーナメント（JST 6/29〜）が課金壁。次のいずれかで解放する:
 *      1. 購入済み（買い切り）            → 恒久解放
 *      2. 決勝T開始**後**の新規登録から 72h 以内 → 遅参救済（無料体験）
 *  - 上記いずれにも当てはまらなければ paywall。
 *
 * すべて純関数（DB/Clerk/IO 非依存）。実際の購入フラグ・登録日時は呼び出し側（サーバ）が
 * Clerk / DB から取得して渡す。クライアントの申告値を信用しないため判定はサーバでのみ行う。
 */

/** 遅参救済の無料時間（ミリ秒）。決勝T開始後に新規登録したユーザーへ付与する。 */
export const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000;

/** entitlement 判定の入力。すべてサーバ側で確定した値を渡す。 */
export type EntitlementInput = {
  /** 判定基準時刻。 */
  now: Date;
  /** 買い切り購入済みか（DB の entitlements.status === 'active'）。 */
  purchased: boolean;
  /**
   * Clerk のアカウント作成時刻（ms epoch）。未ログイン/不明なら null。
   * 遅参救済（72h 無料）の起点に使う。
   */
  clerkCreatedAtMs: number | null;
};

/** アクセス可否の理由（UI 文言や計測の分岐に使える）。 */
export type EntitlementReason =
  | 'free_period' // 決勝T開始前（全員無料）
  | 'purchased' // 買い切り購入済み
  | 'grace' // 決勝T開始後の新規登録・72h 救済中
  | 'locked'; // 課金壁（要購入）

export type EntitlementResult = {
  /** 決勝T関連コンテンツへアクセスできるか。 */
  hasAccess: boolean;
  reason: EntitlementReason;
  /** grace のとき、救済が切れる時刻（ms epoch）。それ以外は null。 */
  graceEndsAtMs: number | null;
};

/**
 * 決勝トーナメント開始前（無料期間）か。{@link KNOCKOUT_START_UTC} 未満なら true。
 * pricing.isFreePeriod と同義だが、entitlement 文脈で明示的に再エクスポートしておく。
 */
export function isBeforeKnockout(now: Date): boolean {
  return now.getTime() < KNOCKOUT_START_UTC;
}

/**
 * 決勝T開始後に新規登録したユーザーの 72h 救済が、基準時刻でまだ有効か。
 *
 * 条件:
 *  - 登録時刻が決勝T開始（境界）以降であること（グループ期間中の登録は対象外＝
 *    その人達は無料期間を丸ごと使えたので救済しない）。
 *  - 登録から 72h 以内であること。
 *
 * @returns 救済中なら救済終了時刻(ms)、対象外なら null。
 */
export function graceWindow(clerkCreatedAtMs: number | null, now: Date): number | null {
  if (clerkCreatedAtMs == null) return null;
  // 決勝T開始前に登録した人は救済対象外（無料期間を使えている）。
  if (clerkCreatedAtMs < KNOCKOUT_START_UTC) return null;
  const graceEndsAtMs = clerkCreatedAtMs + GRACE_PERIOD_MS;
  return now.getTime() < graceEndsAtMs ? graceEndsAtMs : null;
}

/**
 * 決勝T関連コンテンツへのアクセス可否を判定する（サーバ純関数）。
 * 優先順位: 無料期間 > 購入済み > 72h 救済 > 課金壁。
 */
export function evaluateEntitlement(input: EntitlementInput): EntitlementResult {
  const { now, purchased, clerkCreatedAtMs } = input;

  // 1. 決勝T開始前は全員無料。
  if (isBeforeKnockout(now)) {
    return { hasAccess: true, reason: 'free_period', graceEndsAtMs: null };
  }

  // 2. 購入済みは恒久解放。
  if (purchased) {
    return { hasAccess: true, reason: 'purchased', graceEndsAtMs: null };
  }

  // 3. 決勝T開始後の新規登録・72h 救済中。
  const graceEndsAtMs = graceWindow(clerkCreatedAtMs, now);
  if (graceEndsAtMs != null) {
    return { hasAccess: true, reason: 'grace', graceEndsAtMs };
  }

  // 4. それ以外は課金壁。
  return { hasAccess: false, reason: 'locked', graceEndsAtMs: null };
}
