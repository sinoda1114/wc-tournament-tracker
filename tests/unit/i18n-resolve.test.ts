import { afterEach, describe, expect, it, vi } from 'vitest';

// next/headers を vi.hoisted で用意したマップでモックする（headers 優先 → cookies）。
const { headerMap, cookieMap } = vi.hoisted(() => ({
  headerMap: new Map<string, string>(),
  cookieMap: new Map<string, string>(),
}));

vi.mock('next/headers', () => ({
  headers: async () => ({ get: (k: string) => headerMap.get(k) ?? null }),
  cookies: async () => ({
    get: (k: string) => {
      const v = cookieMap.get(k);
      return v ? { value: v } : undefined;
    },
  }),
}));

import { LOCALE_COOKIE, LOCALE_HEADER } from '@/lib/i18n/config';
import { resolveLocale } from '@/lib/i18n/server';

afterEach(() => {
  headerMap.clear();
  cookieMap.clear();
});

describe('resolveLocale（ヘッダ → Cookie → 既定）', () => {
  it('x-wc-locale ヘッダが最優先（Cookie より強い）', async () => {
    headerMap.set(LOCALE_HEADER, 'en');
    cookieMap.set(LOCALE_COOKIE, 'es');
    expect(await resolveLocale()).toBe('en');
  });

  it('ヘッダが無ければ Cookie を使う', async () => {
    cookieMap.set(LOCALE_COOKIE, 'pt');
    expect(await resolveLocale()).toBe('pt');
  });

  it('どちらも無ければ既定（ja）', async () => {
    expect(await resolveLocale()).toBe('ja');
  });

  it('不正なロケール値は無視して既定（ja）', async () => {
    headerMap.set(LOCALE_HEADER, 'xx');
    cookieMap.set(LOCALE_COOKIE, 'yy');
    expect(await resolveLocale()).toBe('ja');
  });
});
