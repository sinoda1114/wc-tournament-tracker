import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildCheckoutSessionParams,
  createCheckoutSession,
  stripeLocaleForCheckout,
} from '@/lib/billing/stripe';

function setPriceEnv(): void {
  process.env.STRIPE_PRICE_JP_EARLY = 'price_jp_early';
  process.env.STRIPE_PRICE_INTL_EARLY = 'price_intl_early';
}

const input = {
  userId: 'user_123',
  locale: 'ja' as const,
  now: new Date('2026-06-16T00:00:00.000Z'),
  successUrl: 'https://matchfav.com/billing/success?session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: 'https://matchfav.com/billing/cancel',
  email: 'customer@example.com',
};

afterEach(() => {
  delete process.env.STRIPE_PRICE_JP_EARLY;
  delete process.env.STRIPE_PRICE_INTL_EARLY;
  vi.restoreAllMocks();
});

describe('Stripe Checkout session', () => {
  it('アプリlocaleをStripe Checkout localeへ変換する', () => {
    expect(stripeLocaleForCheckout('ja')).toBe('ja');
    expect(stripeLocaleForCheckout('en')).toBe('en');
    expect(stripeLocaleForCheckout('es')).toBe('es');
    expect(stripeLocaleForCheckout('pt')).toBe('pt');
    expect(stripeLocaleForCheckout('zh')).toBe('zh');
  });

  it('MatchFav用の明細suffixとCheckout localeをSession作成payloadに含める', () => {
    const params = buildCheckoutSessionParams(input, 'price_jp_early', { customer: 'cus_123' });

    expect(params.locale).toBe('ja');
    expect(params.customer).toBe('cus_123');
    expect(params.payment_intent_data).toMatchObject({
      statement_descriptor_suffix: 'MATCHFAV',
      metadata: { userId: 'user_123', product: 'matchfav' },
    });
    expect(params).not.toHaveProperty('payment_method_types');
  });

  it('既存Customerが無ければpreferred_locales付きで作成してCheckoutに渡す', async () => {
    setPriceEnv();
    const client = {
      customers: {
        list: vi.fn().mockResolvedValue({ data: [] }),
        create: vi.fn().mockResolvedValue({ id: 'cus_new' }),
        update: vi.fn(),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/session' }),
        },
      },
    };

    await expect(createCheckoutSession(input, client)).resolves.toBe(
      'https://checkout.stripe.test/session',
    );

    expect(client.customers.create).toHaveBeenCalledWith({
      email: 'customer@example.com',
      preferred_locales: ['ja'],
      metadata: { userId: 'user_123', product: 'matchfav' },
    });
    expect(client.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_new', locale: 'ja' }),
    );
  });

  it('同じuserIdの既存Customerがあればpreferred_localesを更新して再利用する', async () => {
    setPriceEnv();
    const client = {
      customers: {
        list: vi.fn().mockResolvedValue({
          data: [{ id: 'cus_existing', metadata: { userId: 'user_123' } }],
        }),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'cus_existing' }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/session' }),
        },
      },
    };

    await createCheckoutSession({ ...input, locale: 'en' }, client);

    expect(client.customers.create).not.toHaveBeenCalled();
    expect(client.customers.update).toHaveBeenCalledWith('cus_existing', {
      preferred_locales: ['en'],
    });
    expect(client.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing', locale: 'en' }),
    );
  });
});
