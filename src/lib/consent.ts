/**
 * Cookie / localStorage 利用同意のストレージ層。
 *
 * - 本サイトはお気に入り（localStorage）・投票（匿名 cookie）に端末内ストレージを使うため、
 *   その利用にユーザーが同意したかどうかをこのモジュールで永続化する。
 * - 保存先は `localStorage`（favorites.ts と同じ方針）。SSR では安全に no-op / 既定値を返す。
 * - バージョン番号を持たせ、将来「同意文面が実質的に変わったら再同意を促す」運用ができるようにする。
 */

export const CONSENT_KEY = 'wc:cookie-consent';

/**
 * 同意文面のバージョン。同意の意味が変わる改定をしたら数値を上げる。
 * 保存値のバージョンがこれと異なれば「未同意」とみなして再表示する。
 */
export const CONSENT_VERSION = 1;

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * 同意済み（かつ現行バージョン）かどうかを返す。
 * SSR・未同意・パース不能・旧バージョンはすべて false。
 */
export function readConsentAccepted(): boolean {
  if (!hasStorage()) return false;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { accepted?: unknown; version?: unknown };
    return parsed?.accepted === true && parsed?.version === CONSENT_VERSION;
  } catch {
    return false;
  }
}

/** 同意を記録する（現行バージョン＋記録時刻を残す）。 */
export function writeConsentAccepted(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        accepted: true,
        version: CONSENT_VERSION,
        at: new Date().toISOString(),
      }),
    );
  } catch {
    // ストレージ不可（プライベートモード等）では黙って諦める。バナーは次回も出るが実害はない。
  }
}
