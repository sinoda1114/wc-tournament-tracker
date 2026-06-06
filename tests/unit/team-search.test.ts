import { describe, expect, it } from 'vitest';

import { matchesTeamQuery } from '@/lib/team-search';

const team = (nameJa: string, nameEn: string, fifaCode: string) => ({
  nameJa,
  nameEn,
  fifaCode,
});

describe('matchesTeamQuery', () => {
  const brazil = team('ブラジル', 'Brazil', 'BRA');
  const mexico = team('メキシコ', 'México', 'MEX');

  it('空クエリ・空白のみは全件マッチ', () => {
    expect(matchesTeamQuery(brazil, '')).toBe(true);
    expect(matchesTeamQuery(brazil, '   ')).toBe(true);
  });

  it('日本語名の部分一致（前方・中間・後方）', () => {
    expect(matchesTeamQuery(brazil, 'ブラ')).toBe(true);
    expect(matchesTeamQuery(brazil, 'ラジ')).toBe(true);
    expect(matchesTeamQuery(brazil, 'ジル')).toBe(true);
  });

  it('ひらがなでカタカナ名にマッチ（かな種別を無視）', () => {
    expect(matchesTeamQuery(brazil, 'ぶらじる')).toBe(true);
    expect(matchesTeamQuery(brazil, 'ぶら')).toBe(true);
    expect(matchesTeamQuery(mexico, 'めきしこ')).toBe(true);
  });

  it('英語名の大文字小文字を無視', () => {
    expect(matchesTeamQuery(brazil, 'brazil')).toBe(true);
    expect(matchesTeamQuery(brazil, 'BRAZIL')).toBe(true);
    expect(matchesTeamQuery(brazil, 'Bra')).toBe(true);
  });

  it('ラテンのアクセントを無視（México ⇄ mexico）', () => {
    expect(matchesTeamQuery(mexico, 'mexico')).toBe(true);
    expect(matchesTeamQuery(mexico, 'méxico')).toBe(true);
    expect(matchesTeamQuery(mexico, 'MEXICO')).toBe(true);
  });

  it('全角英数を半角化してマッチ（ＢＲＡ→bra）', () => {
    expect(matchesTeamQuery(brazil, 'ＢＲＡ')).toBe(true);
    expect(matchesTeamQuery(brazil, 'ｂｒａ')).toBe(true);
  });

  it('FIFA コードに一致', () => {
    expect(matchesTeamQuery(brazil, 'bra')).toBe(true);
    expect(matchesTeamQuery(brazil, 'BRA')).toBe(true);
  });

  it('無関係なクエリはマッチしない', () => {
    expect(matchesTeamQuery(brazil, 'フランス')).toBe(false);
    expect(matchesTeamQuery(brazil, 'ふらんす')).toBe(false);
    expect(matchesTeamQuery(brazil, 'xyz')).toBe(false);
  });
});
