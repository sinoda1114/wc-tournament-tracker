import { describe, expect, it } from 'vitest';

import {
  currentPrice,
  currentPriceDisplay,
  marketForLocale,
  priceTier,
  PRICE_TABLE,
  KNOCKOUT_START_UTC,
  OFFER_END_DISPLAY,
} from '@/lib/pricing';

const justBefore = new Date(KNOCKOUT_START_UTC - 1); // 早割境界の1ミリ秒前
const atBoundary = new Date(KNOCKOUT_START_UTC); // 境界ちょうど（6/29 00:00 JST）

describe('marketForLocale', () => {
  it('ja は日本市場、それ以外は海外市場', () => {
    expect(marketForLocale('ja')).toBe('jp');
    for (const locale of ['en', 'es', 'pt', 'zh'] as const) {
      expect(marketForLocale(locale)).toBe('intl');
    }
  });
});

describe('priceTier（早割境界=6/29 00:00 JST）', () => {
  it('境界の直前は早割(early)', () => {
    expect(priceTier(justBefore)).toBe('early');
  });
  it('境界ちょうど以降は通常(regular)', () => {
    expect(priceTier(atBoundary)).toBe('regular');
    expect(priceTier(new Date('2026-07-10T00:00:00Z'))).toBe('regular');
  });
});

describe('currentPrice（市場×段階）', () => {
  it('日本: 早割 ¥680 → 通常 ¥980', () => {
    expect(currentPrice('jp', justBefore).amount).toBe(680);
    expect(currentPrice('jp', justBefore).display).toBe('¥680');
    expect(currentPrice('jp', atBoundary).amount).toBe(980);
    expect(currentPrice('jp', atBoundary).display).toBe('¥980');
  });

  it('海外: 早割 $5 → 通常 $7', () => {
    expect(currentPrice('intl', justBefore).amount).toBe(5);
    expect(currentPrice('intl', justBefore).display).toBe('$5');
    expect(currentPrice('intl', atBoundary).amount).toBe(7);
    expect(currentPrice('intl', atBoundary).display).toBe('$7');
  });
});

describe('currentPriceDisplay（ロケール×時刻）', () => {
  it('ja 早割は ¥680、通常は ¥980', () => {
    expect(currentPriceDisplay('ja', justBefore)).toBe('¥680');
    expect(currentPriceDisplay('ja', atBoundary)).toBe('¥980');
  });
  it('en 早割は $5、通常は $7', () => {
    expect(currentPriceDisplay('en', justBefore)).toBe('$5');
    expect(currentPriceDisplay('en', atBoundary)).toBe('$7');
  });
});

describe('PRICE_TABLE 通貨', () => {
  it('日本市場は jpy、海外市場は usd', () => {
    expect(PRICE_TABLE.jp.early.currency).toBe('jpy');
    expect(PRICE_TABLE.intl.regular.currency).toBe('usd');
  });
});

describe('OFFER_END_DISPLAY（T-29 提供期間）', () => {
  it('提供終了日は 2026-09-30', () => {
    expect(OFFER_END_DISPLAY).toBe('2026-09-30');
  });
});
