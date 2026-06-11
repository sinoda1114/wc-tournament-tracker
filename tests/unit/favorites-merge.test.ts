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

  // 端末間同期の実シナリオ（#30）。初回ログイン時に localStorage 分とサーバ分を統合しても
  // どの端末で付けたお気に入りも消えない（和集合）ことを保証する。
  describe('端末間同期シナリオ', () => {
    it('PCでBRA・スマホでJPNを付けた後にログイン→両方残る', () => {
      // remote=サーバ(PCで同期済み)、local=スマホのlocalStorage
      expect(mergeFavoriteCodes(['BRA'], ['JPN'])).toEqual(['BRA', 'JPN']);
    });

    it('3端末で別々に付けた分が累積する（多重マージ）', () => {
      const afterPhone = mergeFavoriteCodes(['BRA'], ['JPN']); // PC→スマホ
      const afterLaptop = mergeFavoriteCodes(afterPhone, ['FRA']); // →ノートPC
      expect(afterLaptop).toEqual(['BRA', 'JPN', 'FRA']);
    });

    it('同じ国を別端末で付けても二重にならない', () => {
      expect(mergeFavoriteCodes(['JPN', 'BRA'], ['bra', 'JPN'])).toEqual(['JPN', 'BRA']);
    });

    it('既にサーバと一致していれば順序も件数も不変（無駄な書き戻しを避ける前提）', () => {
      const remote = ['BRA', 'JPN', 'FRA'];
      const merged = mergeFavoriteCodes(remote, ['JPN', 'BRA']);
      expect(merged).toEqual(remote);
      expect(merged.length).toBe(remote.length);
    });
  });
});
