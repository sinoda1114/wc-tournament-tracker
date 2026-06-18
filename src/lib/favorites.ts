/**
 * お気に入りチーム機能のストレージ層。
 *
 * - 保存先は `localStorage`（DB には持たない）。
 * - `typeof window === 'undefined'` の SSR 環境では安全に no-op / 既定値を返す。
 * - 値の正規化:
 *   - FIFA コードは大文字に揃え、空白を除去、重複は排除する。
 *   - フィルタートグルは boolean を `"1"` / `"0"` の文字列で保存する（JSON より軽量）。
 */

import type { MatchDetail } from '@/db/queries';

export const FAVORITES_KEY = 'wc:favorite-teams';
export const FILTER_KEY = 'wc:favorite-filter';
/**
 * ログアウト中に付けた★（次回ログイン時にアカウントへ「加算」マージする保留分）。
 * これを「ログイン端末に残った古いキャッシュ」と区別することで、サーバ権威の同期でも
 * ログアウト中の★を失わず、かつ他端末の削除を蘇らせない（fix: 端末間お気に入り整合）。
 */
export const ANON_PENDING_KEY = 'wc:favorites-anon-pending';

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

/** ログアウト中に付けた★の保留リストを読む（次回ログインで加算マージする）。 */
export function readAnonPending(): string[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(ANON_PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeList(parsed);
  } catch {
    return [];
  }
}

function writeAnonPending(codes: readonly string[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(ANON_PENDING_KEY, JSON.stringify(normalizeList(codes)));
  } catch {
    return;
  }
}

/** ログアウト中の★追加を保留に記録する。 */
export function addAnonPending(code: string): void {
  const target = normalizeCode(code);
  if (!target) return;
  const current = readAnonPending();
  if (current.includes(target)) return;
  writeAnonPending([...current, target]);
}

/** ログアウト中に付けた★を（まだログイン前に）外したら保留からも消す。 */
export function removeAnonPending(code: string): void {
  const target = normalizeCode(code);
  if (!target) return;
  writeAnonPending(readAnonPending().filter((c) => c !== target));
}

/** 保留分をログインでアカウントへ反映し終えたら一掃する。 */
export function clearAnonPending(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(ANON_PENDING_KEY);
  } catch {
    return;
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

/**
 * 試合の home / away のいずれかがお気に入り集合に含まれるか（純関数・DOM 非依存）。
 * 試合カードのお気に入りフィルター（FilterableMatchList / MatchDayList）で共用する。
 */
export function matchHasFavorite(match: MatchDetail, favorites: ReadonlySet<string>): boolean {
  const home = match.homeTeam?.fifaCode;
  const away = match.awayTeam?.fifaCode;
  return (
    (home ? isFavorite(home, favorites) : false) ||
    (away ? isFavorite(away, favorites) : false)
  );
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

/**
 * 端末間同期のマージ関数（実装済み）。
 *
 * - 保存: ログイン時は `user_favorites(user_id, fifa_code)`（src/app/favorites/actions.ts）。
 *   未ログイン時はこの localStorage 実装。useFavoriteTeams が両者を束ねる。
 * - **初回ログイン時**、匿名 localStorage の分を失わないよう、この `mergeFavoriteCodes` で
 *   サーバ側と統合してから永続化する（syncFavoritesAction が利用）。
 *
 * ローカルとリモートのお気に入りコードを正規化（大文字・空白除去・重複排除）して和集合で返す。
 * リモートの並びを優先し、ローカル固有分を後ろに足す純関数（テスト可能・DOM 非依存）。
 */
export function mergeFavoriteCodes(
  remote: readonly string[],
  local: readonly string[],
): string[] {
  return normalizeList([...remote, ...local]);
}
