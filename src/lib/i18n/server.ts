import { cookies, headers } from 'next/headers';

import { DEFAULT_TIME_ZONE, isValidTimeZone, TZ_COOKIE } from '@/lib/timezone';

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_HEADER, type Locale } from './config';

/**
 * Server Component / Server Action で現在ロケールを解決する。
 * 優先順位: middleware が付与する x-wc-locale ヘッダ（ロケール別URL /en 等）→ Cookie（スイッチャー選択）→ 既定。
 * headers/cookies を読むだけなので RSC レンダリング中に呼べる。
 */
export async function resolveLocale(): Promise<Locale> {
  // 優先1: ロケール別URL（/en 等）で middleware が付与するヘッダ。
  const headerStore = await headers();
  const fromHeader = headerStore.get(LOCALE_HEADER);
  if (isLocale(fromHeader)) return fromHeader;
  // 優先2: 言語スイッチャーが保存する Cookie（内部ページの遷移はこれで言語継続）。
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
}

/**
 * 表示タイムゾーンを解決する（wc_tz cookie → 既定）。言語とは独立。
 * cookie 未設定時は既定（Asia/Tokyo）。client 側で検出して cookie 保存後、再描画で反映される。
 */
export async function resolveTimeZone(): Promise<string> {
  const store = await cookies();
  const value = store.get(TZ_COOKIE)?.value;
  return value && isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}
