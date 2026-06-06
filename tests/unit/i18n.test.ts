import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, isLocale, LOCALES, LOCALE_LABELS } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';

/** ネストした辞書の全キーをドット区切りで列挙する（並びは問わない）。 */
function flatKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object'
      ? flatKeys(v as object, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe('i18n config', () => {
  it('既定ロケールは対応リストに含まれる', () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });

  it('isLocale は対応ロケールのみ true', () => {
    expect(isLocale('ja')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it('全ロケールにラベルがある', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_LABELS[locale]).toBeTruthy();
    }
  });
});

describe('getDictionary', () => {
  it('ロケールごとに別の辞書を返す', () => {
    expect(getDictionary('ja').nav.groups).toBe('グループリーグ');
    expect(getDictionary('en').nav.groups).toBe('Groups');
  });

  it('全ロケールが ja と同じキー構造（翻訳漏れが無い）', () => {
    const base = flatKeys(getDictionary('ja')).sort();
    for (const locale of LOCALES) {
      expect(flatKeys(getDictionary(locale)).sort()).toEqual(base);
    }
  });
});
