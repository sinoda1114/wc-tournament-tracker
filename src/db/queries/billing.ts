import { getDb } from '@/db/client';

/**
 * 買い切り課金（T-14）の entitlement 永続化。libSQL のみに依存（純 SQL）。
 *
 * - 購入の真偽は webhook（checkout.session.completed・署名検証済み）からのみ書き込む。
 * - 冪等性は stripe_processed_events（event_id PRIMARY KEY）で担保し、同一 event を二重適用しない。
 * - 読み出しは「購入済みか（status === 'active'）」のみを entitlement 判定へ渡す。
 *
 * クライアント由来の値は一切書かない（金額・status はサーバ/Stripe が決定）。
 */

const db = () => getDb();

/** entitlements 1行の生データ。 */
export type EntitlementRow = {
  userId: string;
  status: string;
  purchasedAt: string | null;
  stripeCustomerId: string | null;
  stripeSessionId: string | null;
};

/** ユーザーが買い切り購入済み（status === 'active'）か。未行は false。 */
export async function hasActiveEntitlement(userId: string): Promise<boolean> {
  const result = await db().execute({
    sql: 'SELECT 1 FROM entitlements WHERE user_id = ? AND status = ? LIMIT 1',
    args: [userId, 'active'],
  });
  return result.rows.length > 0;
}

/** entitlement 行を取得（無ければ null）。 */
export async function getEntitlement(userId: string): Promise<EntitlementRow | null> {
  const result = await db().execute({
    sql: `SELECT user_id, status, purchased_at, stripe_customer_id, stripe_session_id
          FROM entitlements WHERE user_id = ? LIMIT 1`,
    args: [userId],
  });
  const raw = result.rows[0];
  if (!raw) return null;
  // libSQL の Row は動的形状。SELECT した列名で読み出すためアサートする。
  const row = raw as unknown as {
    user_id: string;
    status: string;
    purchased_at: string | null;
    stripe_customer_id: string | null;
    stripe_session_id: string | null;
  };
  return {
    userId: row.user_id,
    status: row.status,
    purchasedAt: row.purchased_at,
    stripeCustomerId: row.stripe_customer_id,
    stripeSessionId: row.stripe_session_id,
  };
}

/**
 * Stripe イベントを「未処理なら処理済みに記録」して true を返す（冪等ゲート）。
 * 既に記録済み（再送）なら false を返し、呼び出し側は副作用をスキップする。
 *
 * INSERT が PRIMARY KEY 衝突を起こさず成功＝初回処理。
 */
export async function markStripeEventProcessed(eventId: string): Promise<boolean> {
  const result = await db().execute({
    sql: 'INSERT OR IGNORE INTO stripe_processed_events (event_id) VALUES (?)',
    args: [eventId],
  });
  // rowsAffected === 1 なら新規挿入（初回）。0 なら既存（再送）。
  return result.rowsAffected === 1;
}

/**
 * 冪等記録を取り消す（副作用の適用に失敗したとき・再送で再試行させるため）。
 */
export async function unmarkStripeEventProcessed(eventId: string): Promise<void> {
  await db().execute({
    sql: 'DELETE FROM stripe_processed_events WHERE event_id = ?',
    args: [eventId],
  });
}

/**
 * 購入を確定して entitlement を active にする（UPSERT）。
 * webhook の checkout.session.completed からのみ呼ぶ。
 */
export async function activateEntitlement(input: {
  userId: string;
  stripeCustomerId: string | null;
  stripeSessionId: string | null;
}): Promise<void> {
  const { userId, stripeCustomerId, stripeSessionId } = input;
  await db().execute({
    sql: `INSERT INTO entitlements
            (user_id, status, purchased_at, stripe_customer_id, stripe_session_id, updated_at)
          VALUES
            (?, 'active', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
          ON CONFLICT(user_id) DO UPDATE SET
            status = 'active',
            purchased_at = COALESCE(entitlements.purchased_at, excluded.purchased_at),
            stripe_customer_id = excluded.stripe_customer_id,
            stripe_session_id = excluded.stripe_session_id,
            updated_at = excluded.updated_at`,
    args: [userId, stripeCustomerId, stripeSessionId],
  });
}
