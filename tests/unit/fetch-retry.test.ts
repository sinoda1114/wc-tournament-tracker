import { describe, expect, it, vi } from 'vitest';

import { fetchJsonWithRetry } from '@/lib/fetch-retry';

/** 最小限の Response モック。 */
function mockRes(ok: boolean, body: unknown, status = ok ? 200 : 500): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

const noSleep = async () => {};

describe('fetchJsonWithRetry', () => {
  it('成功すれば JSON を返す（1回呼び出し）', async () => {
    const fetchImpl = vi.fn(async () => mockRes(true, { a: 1 }));
    const out = await fetchJsonWithRetry<{ a: number }>('u', {
      fetchImpl,
      sleep: noSleep,
    });
    expect(out).toEqual({ a: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('一過性失敗の後に成功する（再試行）', async () => {
    let n = 0;
    const fetchImpl = vi.fn(async () => {
      n += 1;
      if (n < 3) throw new Error('network');
      return mockRes(true, { ok: true });
    });
    const out = await fetchJsonWithRetry('u', {
      fetchImpl,
      sleep: noSleep,
      retries: 3,
    });
    expect(out).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('HTTP エラーも再試行し、尽きたら throw する', async () => {
    const fetchImpl = vi.fn(async () => mockRes(false, {}, 503));
    await expect(
      fetchJsonWithRetry('u', { fetchImpl, sleep: noSleep, retries: 2 }),
    ).rejects.toThrow(/after 3 attempts/);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // 初回 + 2 再試行
  });

  it('retries=0 なら 1 回だけ試す', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('x');
    });
    await expect(
      fetchJsonWithRetry('u', { fetchImpl, sleep: noSleep, retries: 0 }),
    ).rejects.toThrow(/after 1 attempts/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
