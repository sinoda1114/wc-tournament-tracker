import { beforeEach, describe, expect, it } from 'vitest';

import { checkRateLimit, resetRateLimitStore } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  const store = new Map<string, { count: number; resetAt: number }>();
  const opts = { limit: 3, windowMs: 1000 };

  beforeEach(() => resetRateLimitStore(store));

  it('limit までは許可し、超えると拒否する', () => {
    const t = 1000;
    expect(checkRateLimit('k', opts, t, store).allowed).toBe(true); // 1
    expect(checkRateLimit('k', opts, t, store).allowed).toBe(true); // 2
    expect(checkRateLimit('k', opts, t, store).allowed).toBe(true); // 3
    const r = checkRateLimit('k', opts, t, store); // 4
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.retryAfterMs).toBe(1000);
  });

  it('remaining を正しく返す', () => {
    expect(checkRateLimit('k', opts, 0, store).remaining).toBe(2);
    expect(checkRateLimit('k', opts, 0, store).remaining).toBe(1);
    expect(checkRateLimit('k', opts, 0, store).remaining).toBe(0);
  });

  it('窓が過ぎたらリセットされる', () => {
    checkRateLimit('k', opts, 0, store);
    checkRateLimit('k', opts, 0, store);
    checkRateLimit('k', opts, 0, store);
    expect(checkRateLimit('k', opts, 0, store).allowed).toBe(false);
    // resetAt(=1000) に到達 → 新しい窓
    const r = checkRateLimit('k', opts, 1000, store);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it('key ごとに独立してカウントする', () => {
    checkRateLimit('a', opts, 0, store);
    checkRateLimit('a', opts, 0, store);
    checkRateLimit('a', opts, 0, store);
    expect(checkRateLimit('a', opts, 0, store).allowed).toBe(false);
    expect(checkRateLimit('b', opts, 0, store).allowed).toBe(true);
  });
});
