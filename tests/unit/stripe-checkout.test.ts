import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildCheckoutSessionParams,
  checkoutProductCopy,
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

const jaLineItem = {
  quantity: 1,
  price_data: {
    currency: 'jpy',
    unit_amount: 680,
    product_data: {
      name: 'MatchFav フルアクセス（買い切り）',
      description: 'MatchFav の決勝トーナメント投票など全機能を解放する買い切りパス',
    },
  },
};

function createClient(overrides: {
  customers?: Partial<{
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  }>;
  prices?: Partial<{ retrieve: ReturnType<typeof vi.fn> }>;
  checkout?: Partial<{ create: ReturnType<typeof vi.fn> }>;
} = {}) {
  return {
    customers: {
      list: overrides.customers?.list ?? vi.fn().mockResolvedValue({ data: [] }),
      create: overrides.customers?.create ?? vi.fn().mockResolvedValue({ id: 'cus_new' }),
      update: overrides.customers?.update ?? vi.fn(),
    },
    prices: {
      retrieve:
        overrides.prices?.retrieve ??
        vi.fn().mockResolvedValue({ currency: 'jpy', unit_amount: 680 }),
    },
    checkout: {
      sessions: {
        create:
          overrides.checkout?.create ??
          vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/session' }),
      },
    },
  } as NonNullable<Parameters<typeof createCheckoutSession>[1]>;
}

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

  it('Stripeへ渡す商品名と説明をlocale別に返す', () => {
    expect(checkoutProductCopy('ja')).toEqual({
      name: 'MatchFav フルアクセス（買い切り）',
      description: 'MatchFav の決勝トーナメント投票など全機能を解放する買い切りパス',
    });
    expect(checkoutProductCopy('en')).toEqual({
      name: 'MatchFav Full Access (one-time purchase)',
      description:
        'Unlock knockout predictions, brackets, and all paid MatchFav features with one pass.',
    });
  });

  it('MatchFav用の明細suffixとCheckout localeをSession作成payloadに含める', () => {
    const params = buildCheckoutSessionParams(input, jaLineItem, { customer: 'cus_123' });

    expect(params.locale).toBe('ja');
    expect(params.customer).toBe('cus_123');
    expect(params.line_items).toEqual([jaLineItem]);
    expect(params.payment_intent_data).toMatchObject({
      statement_descriptor_suffix: 'MATCHFAV',
      metadata: { userId: 'user_123', product: 'matchfav' },
    });
    expect(params).not.toHaveProperty('payment_method_types');
  });

  it('既存Customerが無ければpreferred_locales付きで作成してCheckoutに渡す', async () => {
    setPriceEnv();
    const client = createClient();

    await expect(createCheckoutSession(input, client)).resolves.toBe(
      'https://checkout.stripe.test/session',
    );

    expect(client.prices.retrieve).toHaveBeenCalledWith('price_jp_early');
    expect(client.customers.create).toHaveBeenCalledWith({
      email: 'customer@example.com',
      preferred_locales: ['ja'],
      metadata: { userId: 'user_123', product: 'matchfav' },
    });
    expect(client.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_new',
        locale: 'ja',
        line_items: [jaLineItem],
      }),
    );
  });

  it('同じuserIdの既存Customerがあればpreferred_localesを更新して再利用する', async () => {
    setPriceEnv();
    const client = createClient({
      customers: {
        list: vi.fn().mockResolvedValue({
          data: [{ id: 'cus_existing', metadata: { userId: 'user_123' } }],
        }),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'cus_existing' }),
      },
      prices: {
        retrieve: vi.fn().mockResolvedValue({ currency: 'usd', unit_amount: 500 }),
      },
    });

    await createCheckoutSession({ ...input, locale: 'en' }, client);

    expect(client.prices.retrieve).toHaveBeenCalledWith('price_intl_early');
    expect(client.customers.create).not.toHaveBeenCalled();
    expect(client.customers.update).toHaveBeenCalledWith('cus_existing', {
      preferred_locales: ['en'],
    });
    expect(client.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        locale: 'en',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: 500,
              product_data: checkoutProductCopy('en'),
            },
          },
        ],
      }),
    );
  });
});
