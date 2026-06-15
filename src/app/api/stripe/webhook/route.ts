import { NextResponse } from 'next/server';

import type Stripe from 'stripe';

import {
  activateEntitlement,
  markStripeEventProcessed,
  unmarkStripeEventProcessed,
} from '@/db/queries/billing';
import { getStripe, getWebhookSecret } from '@/lib/billing/stripe';

export const dynamic = 'force-dynamic';
// 署名検証には生のリクエストボディが必要。Next の自動パースを避けるため text() で読む。

/**
 * Stripe Webhook（T-14）。`checkout.session.completed` で entitlement を active 化する。
 *
 * セキュリティ:
 *  - 署名検証必須（stripe.webhooks.constructEvent）。失敗は 400 で即拒否。
 *  - 冪等: 同一 event.id は markStripeEventProcessed で1回だけ適用（再送に強い）。
 *  - userId は metadata / client_reference_id（Checkout 作成時にサーバが載せた値）から取る。
 */
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ ok: false, message: 'missing signature' }, { status: 400 });
  }

  // 生ボディ（署名検証は raw payload に対して行う）。
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, getWebhookSecret());
  } catch (error) {
    // 署名不一致・シークレット未設定など。詳細はログのみ、レスポンスは最小。
    console.error('[stripe/webhook] signature verification failed', error);
    return NextResponse.json({ ok: false, message: 'invalid signature' }, { status: 400 });
  }

  try {
    // 冪等ゲート: 既処理イベント（再送）は副作用をスキップして 200 を返す。
    // 先に記録して二重処理を防ぐが、副作用（DB 書き込み）が失敗した場合は
    // 記録を取り消し、Stripe の再送で復旧できるようにする（fail-safe）。
    const isNew = await markStripeEventProcessed(event.id);
    if (!isNew) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      // 買い切り（mode: payment）かつ支払い済みのみ確定（与信のみ等を弾く）。
      const paid = session.payment_status === 'paid';
      const userId = session.client_reference_id ?? session.metadata?.userId ?? null;

      if (paid && userId) {
        const customerId =
          typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);
        try {
          await activateEntitlement({
            userId,
            stripeCustomerId: customerId,
            stripeSessionId: session.id,
          });
        } catch (applyError) {
          // entitlement 付与に失敗したら冪等記録を取り消し、再送で再試行させる。
          await unmarkStripeEventProcessed(event.id).catch(() => undefined);
          throw applyError;
        }
      } else {
        // userId 欠落 or 未払いは確定しない（記録済み＝再処理されない。設計上 userId は必ず付く）。
        console.warn('[stripe/webhook] completed but skipped', {
          paid,
          hasUserId: Boolean(userId),
          sessionId: session.id,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // 適用中の DB 障害等。500 を返すと Stripe が再送する（冪等ゲートで二重適用は防がれる）。
    console.error('[stripe/webhook] processing failed', error);
    return NextResponse.json({ ok: false, message: 'processing failed' }, { status: 500 });
  }
}
