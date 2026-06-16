import { afterEach, describe, expect, it, vi } from 'vitest';

import { verifyStripeConfig } from '@/lib/billing/stripe';

/**
 * Stripe 価格設定の自動検証（対策A）。
 * 2026-06-16 の checkout 500（別アカウントの鍵で live 価格を引けず No such price）を、
 * 全 Price ID を「使われる前に」問い合わせて検出できることを担保する。
 */

const ENV_NAMES = [
  'STRIPE_PRICE_JP_EARLY',
  'STRIPE_PRICE_JP_REGULAR',
  'STRIPE_PRICE_INTL_EARLY',
  'STRIPE_PRICE_INTL_REGULAR',
] as const;

function setAllPriceEnv(): void {
  process.env.STRIPE_PRICE_JP_EARLY = 'price_jp_early';
  process.env.STRIPE_PRICE_JP_REGULAR = 'price_jp_regular';
  process.env.STRIPE_PRICE_INTL_EARLY = 'price_intl_early';
  process.env.STRIPE_PRICE_INTL_REGULAR = 'price_intl_regular';
}

afterEach(() => {
  for (const name of ENV_NAMES) delete process.env[name];
  vi.restoreAllMocks();
});

describe('verifyStripeConfig', () => {
  it('全 Price ID が実在し active なら ok=true', async () => {
    setAllPriceEnv();
    const client = { prices: { retrieve: vi.fn().mockResolvedValue({ active: true }) } };

    const report = await verifyStripeConfig(client);

    expect(report.ok).toBe(true);
    expect(report.secretConfigured).toBe(true);
    expect(report.checks).toHaveLength(4);
    expect(report.checks.every((c) => c.valid)).toBe(true);
  });

  it('ある Price が存在しない（No such price）なら ok=false でその鍵を異常として報告', async () => {
    setAllPriceEnv();
    const client = {
      prices: {
        retrieve: vi.fn((id: string) =>
          id === 'price_jp_regular'
            ? Promise.reject(new Error("No such price: 'price_jp_regular'"))
            : Promise.resolve({ active: true }),
        ),
      },
    };

    const report = await verifyStripeConfig(client);

    expect(report.ok).toBe(false);
    const bad = report.checks.find((c) => c.envName === 'STRIPE_PRICE_JP_REGULAR');
    expect(bad?.valid).toBe(false);
    expect(bad?.error).toContain('No such price');
  });

  it('Price ID が未設定なら configured=false で ok=false', async () => {
    // JP_REGULAR だけ未設定にする。
    process.env.STRIPE_PRICE_JP_EARLY = 'price_jp_early';
    process.env.STRIPE_PRICE_INTL_EARLY = 'price_intl_early';
    process.env.STRIPE_PRICE_INTL_REGULAR = 'price_intl_regular';
    const client = { prices: { retrieve: vi.fn().mockResolvedValue({ active: true }) } };

    const report = await verifyStripeConfig(client);

    expect(report.ok).toBe(false);
    const missing = report.checks.find((c) => c.envName === 'STRIPE_PRICE_JP_REGULAR');
    expect(missing?.configured).toBe(false);
    expect(missing?.valid).toBe(false);
  });

  it('active=false の価格は無効として報告', async () => {
    setAllPriceEnv();
    const client = { prices: { retrieve: vi.fn().mockResolvedValue({ active: false }) } };

    const report = await verifyStripeConfig(client);

    expect(report.ok).toBe(false);
    expect(report.checks.every((c) => c.valid === false)).toBe(true);
  });
});
