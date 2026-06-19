import type Stripe from 'stripe';

import { activateEntitlement, hasActiveEntitlement } from '@/db/queries/billing';
import {
  findMissingGrants,
  type PaidSession,
  type ReconcileResult,
} from '@/lib/billing/reconcile-core';
import { getStripe } from '@/lib/billing/stripe';

/**
 * 課金突合（reconciliation）— 「Stripe で支払い済みなのに entitlement が無い」を検知・自動修復する
 * I/O 実体（#159 / #156 再発防止）。純ロジックは {@link reconcile-core} に分離。
 *
 * - 検知は症状ベース（払ったのに未付与）なので、原因（署名/エンドポイント/処理失敗）を問わず捕まる。
 * - 自動修復は Stripe の paid セッション起点なので付与は正当（webhook と同じ activateEntitlement・冪等）。
 */

/** Stripe の直近 `checkout.session.completed`(paid) を取得して PaidSession[] に正規化する（I/O）。 */
export async function fetchRecentPaidSessions(
  opts: { sinceMs: number; limit?: number },
  client: Stripe = getStripe(),
): Promise<PaidSession[]> {
  const events = await client.events.list({
    type: 'checkout.session.completed',
    created: { gte: Math.floor(opts.sinceMs / 1000) },
    limit: opts.limit ?? 100,
  });

  const sessions: PaidSession[] = [];
  for (const event of events.data) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== 'paid') continue;
    const userId = session.client_reference_id ?? session.metadata?.userId ?? null;
    if (!userId) continue;
    sessions.push({
      userId,
      sessionId: session.id,
      email: session.customer_details?.email ?? null,
      customerId:
        typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null),
    });
  }
  return sessions;
}

/**
 * 突合を実行する。`heal` が true なら未付与を自動付与する（既定 true）。
 * `lookbackDays` 期間の paid セッションを対象にする（Stripe events の保持に依存）。
 */
export async function reconcileEntitlements(
  opts: { now?: Date; lookbackDays?: number; heal?: boolean } = {},
): Promise<ReconcileResult> {
  const now = opts.now ?? new Date();
  const lookbackDays = opts.lookbackDays ?? 7;
  const heal = opts.heal ?? true;
  const sinceMs = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;

  const sessions = await fetchRecentPaidSessions({ sinceMs });
  const checkedUsers = new Set(sessions.map((s) => s.userId)).size;
  const missing = await findMissingGrants(sessions, hasActiveEntitlement);

  const healed: PaidSession[] = [];
  if (heal) {
    for (const s of missing) {
      try {
        await activateEntitlement({
          userId: s.userId,
          stripeCustomerId: s.customerId,
          stripeSessionId: s.sessionId,
        });
        healed.push(s);
      } catch {
        // 付与失敗はそのまま「未付与のまま」として通知に残す（次回 cron で再試行）。
      }
    }
  }

  return { checkedUsers, missing, healed };
}
