import { describe, expect, it } from 'vitest';

import { mergeFavoriteCodes } from '@/lib/favorites';

describe('mergeFavoriteCodes', () => {
  it('リモート優先でローカル固有分を後ろに足す', () => {
    expect(mergeFavoriteCodes(['BRA', 'ARG'], ['JPN'])).toEqual(['BRA', 'ARG', 'JPN']);
  });

  it('重複は排除する（和集合）', () => {
    expect(mergeFavoriteCodes(['BRA', 'JPN'], ['JPN', 'FRA'])).toEqual([
      'BRA', 'JPN', 'FRA',
    ]);
  });

  it('大文字化・空白除去・空要素除去で正規化する', () => {
    expect(mergeFavoriteCodes([' bra '], ['jpn', '', '  '])).toEqual(['BRA', 'JPN']);
  });

  it('片方が空でも動く', () => {
    expect(mergeFavoriteCodes([], ['JPN', 'jpn'])).toEqual(['JPN']);
    expect(mergeFavoriteCodes(['BRA'], [])).toEqual(['BRA']);
  });
});
