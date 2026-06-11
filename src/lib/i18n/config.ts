/**
 * 多言語対応のロケール設定（dep 無し・Cookie 方式）。
 * client/server 双方から安全に import できるよう、ここには next/headers 等を含めない。
 */

/** 対応ロケール。先頭が既定。拡張時はここに追加し messages/<locale>.ts を用意する。 */
export const LOCALES = ['ja', 'en', 'es', 'pt', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ja';

/** 選択ロケールを保持する cookie 名。 */
export const LOCALE_COOKIE = 'wc_locale';

/**
 * middleware がロケール別URL（/en 等）で付与し、resolveLocale が最優先で読むリクエストヘッダ名。
 * proxy.ts（書き込み）と i18n/server.ts（読み取り）で共有するため、dep 無しの config に置く。
 */
export const LOCALE_HEADER = 'x-wc-locale';

/** スイッチャー表示用ラベル（その言語自身の表記）。 */
export const LOCALE_LABELS: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
  es: 'Español',
  pt: 'Português',
  zh: '简体中文',
};

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
