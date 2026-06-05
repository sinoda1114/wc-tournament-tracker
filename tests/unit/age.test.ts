import { describe, expect, it } from 'vitest';

import { calcAge } from '@/lib/age';

describe('calcAge', () => {
  const asOf = new Date('2026-06-05T00:00:00Z');

  it('誕生日が既に来ている年は満年齢を返す', () => {
    expect(calcAge('1991-01-26', asOf)).toBe(35);
  });

  it('誕生日がまだの年は 1 引く', () => {
    // 1990-12-31 生まれは 2026-06-05 時点でまだ 35
    expect(calcAge('1990-12-31', asOf)).toBe(35);
    // 1990-06-06 生まれは前日なのでまだ 35
    expect(calcAge('1990-06-06', asOf)).toBe(35);
  });

  it('誕生日当日はその年齢になる', () => {
    expect(calcAge('2000-06-05', asOf)).toBe(26);
  });

  it('うるう年 2/29 生まれも扱える', () => {
    expect(calcAge('2000-02-29', asOf)).toBe(26);
  });

  it('null/空/不正な文字列は null', () => {
    expect(calcAge(null, asOf)).toBeNull();
    expect(calcAge('', asOf)).toBeNull();
    expect(calcAge('not-a-date', asOf)).toBeNull();
  });

  it('明らかに異常な年齢は null', () => {
    expect(calcAge('1800-01-01', asOf)).toBeNull();
  });
});
