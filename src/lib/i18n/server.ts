import { cookies } from 'next/headers';

import { DEFAULT_TIME_ZONE, isValidTimeZone, TZ_COOKIE } from '@/lib/timezone';

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './config';

/**
 * Server Component / Server Action で現在ロケールを解決する（cookie → 既定）。
 * 認証導入(#13)後は「ログイン中はユーザー設定を優先」へ拡張する（voter.ts と同方針）。
 * cookie を読むだけなので RSC レンダリング中に呼べる。
 */
export async function resolveLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
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
