import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isFreePeriod, KNOCKOUT_START_UTC, priceDisplayForLocale } from '@/lib/pricing';

describe('KNOCKOUT_START_UTC', () => {
  it('決勝T開始=6/29 00:00 JST(=6/28 15:00Z)に固定されている', () => {
    expect(new Date(KNOCKOUT_START_UTC).toISOString()).toBe('2026-06-28T15:00:00.000Z');
  });
});

describe('priceDisplayForLocale', () => {
  it('日本語は ¥980', () => {
    expect(priceDisplayForLocale('ja')).toBe('¥980');
  });

  it('日本語以外は $10', () => {
    for (const locale of ['en', 'es', 'pt', 'zh'] as const) {
      expect(priceDisplayForLocale(locale)).toBe('$10');
    }
  });
});

describe('バナー文言のプレースホルダ置換', () => {
  it('全言語で {price} が価格に置換され、プレースホルダが残らない', () => {
    for (const locale of LOCALES) {
      const price = priceDisplayForLocale(locale);
      const message = getDictionary(locale).paywall.bannerMessage.replace('{price}', price);
      expect(message).not.toContain('{price}');
      expect(message).toContain(price);
    }
  });
});

describe('isFreePeriod', () => {
  it('決勝トーナメント開始(6/29 JST)より前は無料期間', () => {
    // 6/28 23:59 JST = 6/28 14:59Z（境界の1分前・最終グループ戦の日）
    expect(isFreePeriod(new Date('2026-06-28T14:59:00Z'))).toBe(true);
    // グループステージ初日
    expect(isFreePeriod(new Date('2026-06-11T00:00:00Z'))).toBe(true);
  });

  it('決勝トーナメント開始ちょうど以降は無料期間ではない', () => {
    // 6/29 00:00 JST = 6/28 15:00Z（境界ちょうど）
    expect(isFreePeriod(new Date(KNOCKOUT_START_UTC))).toBe(false);
    // R32 初戦(#73)キックオフ 6/29 04:00 JST = 6/28 19:00Z
    expect(isFreePeriod(new Date('2026-06-28T19:00:00Z'))).toBe(false);
    // 決勝
    expect(isFreePeriod(new Date('2026-07-19T00:00:00Z'))).toBe(false);
  });
});
