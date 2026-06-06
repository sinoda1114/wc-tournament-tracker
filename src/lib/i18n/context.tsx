'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import {
  DEFAULT_TIME_ZONE,
  TZ_COOKIE,
  detectTimeZone,
  isValidTimeZone,
} from '@/lib/timezone';

import { DEFAULT_LOCALE, type Locale } from './config';
import { getDictionary, type Dictionary } from './dictionary';

type I18nValue = {
  locale: Locale;
  dict: Dictionary;
  /** 表示タイムゾーン（観戦者ローカル）。言語とは独立。 */
  timeZone: string;
};

const I18nContext = createContext<I18nValue | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;

/** wc_tz cookie に表示TZを保存する（コンポーネント外の副作用ヘルパー）。 */
function persistTimeZone(tz: string): void {
  document.cookie = `${TZ_COOKIE}=${tz}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/** wc_tz cookie が既にあるか。 */
function hasTimeZoneCookie(): boolean {
  return document.cookie.split('; ').some((c) => c.startsWith(`${TZ_COOKIE}=`));
}

/**
 * 現在ロケール・辞書・表示TZを client ツリーへ供給する。
 * 加えて、wc_tz cookie 未設定時のみブラウザTZを検出して保存し、必要なら再描画する
 * （手動選択済み＝cookie あり の場合は尊重して触らない）。
 */
export function I18nProvider({
  locale,
  dict,
  timeZone,
  children,
}: I18nValue & { children: React.ReactNode }) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (hasTimeZoneCookie()) return;
    const detected = detectTimeZone();
    if (!isValidTimeZone(detected)) return;
    persistTimeZone(detected);
    if (detected !== timeZone) router.refresh();
  }, [router, timeZone]);

  return (
    <I18nContext.Provider value={{ locale, dict, timeZone }}>
      {children}
    </I18nContext.Provider>
  );
}

/** 現在のロケール・辞書・TZを取得する（Provider 外では既定にフォールバック）。 */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return {
    locale: DEFAULT_LOCALE,
    dict: getDictionary(DEFAULT_LOCALE),
    timeZone: DEFAULT_TIME_ZONE,
  };
}

/** 辞書だけが欲しい場合のショートカット。 */
export function useDictionary(): Dictionary {
  return useI18n().dict;
}

/** 表示タイムゾーンだけが欲しい場合のショートカット。 */
export function useTimeZone(): string {
  return useI18n().timeZone;
}
