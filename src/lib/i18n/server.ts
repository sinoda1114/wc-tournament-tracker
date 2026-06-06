import { cookies } from 'next/headers';

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
