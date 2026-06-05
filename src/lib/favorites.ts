/**
 * お気に入りチーム機能のストレージ層。
 *
 * - 保存先は `localStorage`（DB には持たない）。
 * - `typeof window === 'undefined'` の SSR 環境では安全に no-op / 既定値を返す。
 * - 値の正規化:
 *   - FIFA コードは大文字に揃え、空白を除去、重複は排除する。
 *   - フィルタートグルは boolean を `"1"` / `"0"` の文字列で保存する（JSON より軽量）。
 */

export const FAVORITES_KEY = 'wc:favorite-teams';
export const FILTER_KEY = 'wc:favorite-filter';

/** 同タブ内の他コンポーネントへ「お気に入り状態が変わった」ことを通知するカスタムイベント名。 */
export const FAVORITES_CHANGED_EVENT = 'wc:favorites-changed';

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function normalizeList(codes: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of codes) {
    if (typeof raw !== 'string') continue;
    const code = normalizeCode(raw);
    if (!code) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    result.push(code);
  }
  return result;
}

export function readFavorites(): string[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeList(parsed);
  } catch {
    return [];
  }
}

export function writeFavorites(codes: readonly string[]): void {
  if (!hasStorage()) return;
  const normalized = normalizeList(codes);
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(normalized));
  } catch {
    return;
  }
  try {
    window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
  } catch {
    // CustomEvent が無い環境（古いブラウザ／テスト）では何もしない。
  }
}

export function toggleFavorite(code: string): string[] {
  const target = normalizeCode(code);
  if (!target) return readFavorites();
  const current = readFavorites();
  const next = current.includes(target)
    ? current.filter((c) => c !== target)
    : [...current, target];
  writeFavorites(next);
  return next;
}

export function isFavorite(code: string, set: ReadonlySet<string>): boolean {
  return set.has(normalizeCode(code));
}

export function readFilterEnabled(): boolean {
  if (!hasStorage()) return false;
  try {
    return window.localStorage.getItem(FILTER_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeFilterEnabled(on: boolean): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(FILTER_KEY, on ? '1' : '0');
  } catch {
    return;
  }
  try {
    window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
  } catch {
    // 同上
  }
}
