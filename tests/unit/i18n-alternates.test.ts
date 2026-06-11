import { describe, expect, it } from 'vitest';

import { buildAlternates, localePath, localeUrl } from '@/lib/i18n/alternates';

// テスト環境では NEXT_PUBLIC_SITE_URL 未設定 → getSiteUrl はフォールバック。
const BASE = 'https://matchfav.com';

describe('localePath（相対パス・client遷移用）', () => {
  it('ja（既定）はプレフィックス無しの "/"', () => {
    expect(localePath('home', 'ja')).toBe('/');
  });

  it('他ロケールは /<locale>', () => {
    expect(localePath('home', 'en')).toBe('/en');
    expect(localePath('home', 'es')).toBe('/es');
    expect(localePath('home', 'pt')).toBe('/pt');
    expect(localePath('home', 'zh')).toBe('/zh');
  });
});

describe('localeUrl（絶対URL）', () => {
  it('ja は base + "/"', () => {
    expect(localeUrl('home', 'ja')).toBe(`${BASE}/`);
  });

  it('他ロケールは base + /<locale>', () => {
    expect(localeUrl('home', 'en')).toBe(`${BASE}/en`);
    expect(localeUrl('home', 'zh')).toBe(`${BASE}/zh`);
  });
});

describe('buildAlternates（canonical + hreflang）', () => {
  it('canonical は現在ロケールのURL', () => {
    expect(buildAlternates('home', 'en').canonical).toBe(`${BASE}/en`);
    expect(buildAlternates('home', 'ja').canonical).toBe(`${BASE}/`);
  });

  it('languages に全ロケール＋ x-default(=ja) を含む', () => {
    const { languages } = buildAlternates('home', 'en');
    expect(languages).toEqual({
      ja: `${BASE}/`,
      en: `${BASE}/en`,
      es: `${BASE}/es`,
      pt: `${BASE}/pt`,
      zh: `${BASE}/zh`,
      'x-default': `${BASE}/`,
    });
  });

  it('x-default は常に ja（既定）を指す', () => {
    expect(buildAlternates('home', 'pt').languages['x-default']).toBe(`${BASE}/`);
  });
});
