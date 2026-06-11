/**
 * 公開ページのロケール別URL生成（#19 B-lite）。
 *
 * - 既定ロケール（ja）は **プレフィックス無し**（`/`）＝既存URL・被リンク・ブックマークを壊さない。
 * - 他ロケールは `/<locale>` プレフィックス（`/en` `/es` `/pt` `/zh`）。
 * - 現状の対象は **トップ（'home'）のみ**。将来ページを増やせるよう page キーで一般化しておく。
 * - `localePath` は相対パス（client 遷移用）、`localeUrl` は絶対URL（metadata/sitemap 用）。
 * - `buildAlternates` は metadata.alternates 用の canonical＋hreflang(languages, x-default含む) を返す純関数。
 *
 * client/server 双方から import 可能（next/headers 非依存）。
 */

import { getSiteUrl } from '@/lib/env';

import { DEFAULT_LOCALE, LOCALES, type Locale } from './config';

/** ロケール別URLを用意する公開ページのキー（今はトップのみ）。 */
export type PublicPageKey = 'home';

/** ページキー → ロケールプレフィックスの後ろに付くベースパス（トップは空＝'/'）。 */
const BASE_PATH: Record<PublicPageKey, string> = {
  home: '',
};

/** 指定ページ・ロケールの相対パス（ja はプレフィックス無し）。client 遷移用。 */
export function localePath(page: PublicPageKey, locale: Locale): string {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return `${prefix}${BASE_PATH[page]}` || '/';
}

/** 指定ページ・ロケールの絶対URL（env の getSiteUrl 基準）。metadata/sitemap 用。 */
export function localeUrl(page: PublicPageKey, locale: Locale): string {
  return `${getSiteUrl()}${localePath(page, locale)}`;
}

export type Alternates = {
  canonical: string;
  languages: Record<string, string>;
};

/**
 * metadata.alternates 用の canonical + hreflang(languages) を返す。
 * languages には全ロケール＋ x-default（=ja）を含める。hreflang はロケールコードをそのまま使う
 * （Google 互換重視で zh はあえて 'zh-Hans' でなく 'zh'）。
 */
export function buildAlternates(page: PublicPageKey, locale: Locale): Alternates {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = localeUrl(page, l);
  }
  languages['x-default'] = localeUrl(page, DEFAULT_LOCALE);
  return { canonical: localeUrl(page, locale), languages };
}

/** OpenGraph の og:locale 用コード（言語_地域）。代表的な地域を1つ割り当てる。 */
const OG_LOCALE: Record<Locale, string> = {
  ja: 'ja_JP',
  en: 'en_US',
  es: 'es_ES',
  pt: 'pt_BR',
  zh: 'zh_CN',
};

export function ogLocale(locale: Locale): string {
  return OG_LOCALE[locale];
}
