/**
 * 依存ゼロのインメモリ固定窓レートリミッタ。
 * 主用途: admin ログインの総当たり緩和（#8）。
 *
 * 注意: Vercel などサーバーレスでは **インスタンスごと** のメモリなので、厳密な全体制限には
 * ならない（ベストエフォート）。厳密にやるなら Upstash/Redis 等の共有ストアへ差し替える（将来）。
 */

type Bucket = { count: number; resetAt: number };

/** 既定の共有ストア（プロセス内）。テストでは別 Map を渡して隔離する。 */
const defaultStore = new Map<string, Bucket>();

export type RateLimitOptions = {
  /** 窓内に許す最大試行回数。 */
  limit: number;
  /** 窓の長さ（ミリ秒）。 */
  windowMs: number;
};

export type RateLimitResult = {
  /** この試行を許可するか。 */
  allowed: boolean;
  /** 現在の窓で残り何回試せるか。 */
  remaining: number;
  /** 制限中なら次に試せるまでの ms（allowed=true なら 0）。 */
  retryAfterMs: number;
};

/**
 * `key`（例 `admin-login:<ip>`）に 1 回分の試行を記録し、許可/拒否を返す。
 * `now` と `store` は差し替え可能（テスト用）。
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now: number = Date.now(),
  store: Map<string, Bucket> = defaultStore,
): RateLimitResult {
  const existing = store.get(key);

  // 窓が無い/期限切れ → 新しい窓を開始（この試行は 1 回目）。
  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterMs: 0 };
  }

  // 窓内で上限到達 → 拒否。
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }

  // 窓内で余裕あり → カウントして許可。
  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterMs: 0 };
}

/** テスト用: ストアをクリアする。 */
export function resetRateLimitStore(store: Map<string, Bucket> = defaultStore): void {
  store.clear();
}
