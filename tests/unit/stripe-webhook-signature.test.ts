import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

/**
 * Webhook 署名検証の挙動を SDK レベルで確認する（T-14 セキュリティ）。
 * 実ルート（src/app/api/stripe/webhook/route.ts）は同じ constructEvent を使うため、
 * ここで「正しい署名は通る／改ざん・誤シークレットは弾く」ことを担保する。
 */

const SECRET = 'whsec_test_secret_for_unit';
const stripe = new Stripe('sk_test_dummy_key_for_unit_only');

function makePayload(): string {
  return JSON.stringify({
    id: 'evt_test_1',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', payment_status: 'paid' } },
  });
}

describe('stripe.webhooks.constructEvent', () => {
  it('正しい署名のイベントは検証を通る', () => {
    const payload = makePayload();
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const event = stripe.webhooks.constructEvent(payload, header, SECRET);
    expect(event.id).toBe('evt_test_1');
    expect(event.type).toBe('checkout.session.completed');
  });

  it('ボディ改ざんは検証エラーで弾く', () => {
    const payload = makePayload();
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const tampered = payload.replace('cs_test_1', 'cs_tampered');
    expect(() => stripe.webhooks.constructEvent(tampered, header, SECRET)).toThrow();
  });

  it('誤ったシークレットでは検証エラーで弾く', () => {
    const payload = makePayload();
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect(() =>
      stripe.webhooks.constructEvent(payload, header, 'whsec_wrong_secret'),
    ).toThrow();
  });
});
