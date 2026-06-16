import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import {
  earlyPriceDisplayForLocale,
  isFreePeriod,
  KNOCKOUT_START_UTC,
  priceDisplayForLocale,
  regularPriceDisplayForLocale,
} from '@/lib/pricing';

describe('KNOCKOUT_START_UTC', () => {
  it('決勝T開始=6/29 00:00 JST(=6/28 15:00Z)に固定されている', () => {
    expect(new Date(KNOCKOUT_START_UTC).toISOString()).toBe('2026-06-28T15:00:00.000Z');
  });
});

describe('priceDisplayForLocale', () => {
  it('日本語は ¥980', () => {
    expect(priceDisplayForLocale('ja')).toBe('¥980');
  });

  it('日本語以外は $7（通常価格＝早割後の上限）', () => {
    for (const locale of ['en', 'es', 'pt', 'zh'] as const) {
      expect(priceDisplayForLocale(locale)).toBe('$7');
    }
  });
});

describe('早割/通常の表示価格ヘルパー（PRICE_TABLE 由来）', () => {
  it('日本語は早割 ¥680 / 通常 ¥980', () => {
    expect(earlyPriceDisplayForLocale('ja')).toBe('¥680');
    expect(regularPriceDisplayForLocale('ja')).toBe('¥980');
  });

  it('日本語以外は早割 $5 / 通常 $7', () => {
    for (const locale of ['en', 'es', 'pt', 'zh'] as const) {
      expect(earlyPriceDisplayForLocale(locale)).toBe('$5');
      expect(regularPriceDisplayForLocale(locale)).toBe('$7');
    }
  });

  it('regularPriceDisplayForLocale は priceDisplayForLocale と一致する（通常価格＝上限）', () => {
    for (const locale of LOCALES) {
      expect(regularPriceDisplayForLocale(locale)).toBe(priceDisplayForLocale(locale));
    }
  });
});

describe('バナー文言のプレースホルダ置換', () => {
  it('全言語で {earlyPrice}/{regularPrice} が価格に置換され、プレースホルダが残らない', () => {
    for (const locale of LOCALES) {
      const earlyPrice = earlyPriceDisplayForLocale(locale);
      const regularPrice = regularPriceDisplayForLocale(locale);
      const message = getDictionary(locale)
        .paywall.bannerMessage.replace('{earlyPrice}', earlyPrice)
        .replace('{regularPrice}', regularPrice);
      expect(message).not.toContain('{earlyPrice}');
      expect(message).not.toContain('{regularPrice}');
      expect(message).toContain(earlyPrice);
      expect(message).toContain(regularPrice);
    }
  });

  it('全言語で購入導線CTAのラベル/ariaが空でない', () => {
    for (const locale of LOCALES) {
      const { bannerCta, bannerCtaAria } = getDictionary(locale).paywall;
      expect(bannerCta.trim().length).toBeGreaterThan(0);
      expect(bannerCtaAria.trim().length).toBeGreaterThan(0);
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
