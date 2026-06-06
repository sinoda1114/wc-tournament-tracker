/**
 * タイムアウト＋指数バックオフ付きで JSON を取得する汎用フェッチ。
 * 取得スクリプト（スカッド取り込み等）の一過性ネットワーク失敗に対する堅牢化に使う。
 * `fetchImpl` / `sleep` を差し替え可能にしてテストできるようにしている。
 */
export type FetchJsonOptions = {
  /** 失敗時の再試行回数（初回を除く）。既定 3。 */
  retries?: number;
  /** 1 回あたりのタイムアウト（ms）。既定 15000。 */
  timeoutMs?: number;
  /** 初回バックオフ（ms）。各再試行で 2 倍。既定 500。 */
  backoffMs?: number;
  headers?: Record<string, string>;
  /** テスト用: fetch を差し替える。 */
  fetchImpl?: typeof fetch;
  /** テスト用: 待機を差し替える。 */
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * `url` から JSON を取得し `T` として返す。HTTP エラー/例外/タイムアウトは再試行し、
 * 全試行が失敗したら最後のエラーを含めて throw する。
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const {
    retries = 3,
    timeoutMs = 15_000,
    backoffMs = 500,
    headers,
    fetchImpl = fetch,
    sleep = defaultSleep,
  } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { headers, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `fetch failed after ${retries + 1} attempts: ${url} (${reason})`,
  );
}
