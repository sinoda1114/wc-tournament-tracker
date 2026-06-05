import { describe, expect, it } from 'vitest';

import { resolveTeamId } from '@/lib/ingest/team-resolver';

const teams = [
  { id: 'kor', nameEn: 'Korea Republic', fifaCode: 'KOR' },
  { id: 'tur', nameEn: 'Türkiye', fifaCode: 'TUR' },
  { id: 'civ', nameEn: "Côte d'Ivoire", fifaCode: 'CIV' },
  { id: 'cod', nameEn: 'Congo DR', fifaCode: 'COD' },
  { id: 'cpv', nameEn: 'Cabo Verde', fifaCode: 'CPV' },
  { id: 'irn', nameEn: 'IR Iran', fifaCode: 'IRN' },
  { id: 'usa', nameEn: 'United States', fifaCode: 'USA' },
  { id: 'cze', nameEn: 'Czechia', fifaCode: 'CZE' },
  { id: 'bra', nameEn: 'Brazil', fifaCode: 'BRA' },
  { id: 'bih', nameEn: 'Bosnia and Herzegovina', fifaCode: 'BIH' },
];

describe('resolveTeamId', () => {
  it('英語名が一致するチームを解決する', () => {
    expect(resolveTeamId('Brazil', teams)).toBe('bra');
    expect(resolveTeamId('Bosnia and Herzegovina', teams)).toBe('bih');
  });

  it('FIFAコードで解決できる', () => {
    expect(resolveTeamId('BRA', teams)).toBe('bra');
  });

  it('ダイアクリティクス（アクセント）を無視して一致する', () => {
    expect(resolveTeamId('Türkiye', teams)).toBe('tur');
    expect(resolveTeamId("Côte d'Ivoire", teams)).toBe('civ');
  });

  it('別名（外部APIの呼び方）を解決する', () => {
    expect(resolveTeamId('South Korea', teams)).toBe('kor');
    expect(resolveTeamId('Turkey', teams)).toBe('tur');
    expect(resolveTeamId('Ivory Coast', teams)).toBe('civ');
    expect(resolveTeamId('DR Congo', teams)).toBe('cod');
    expect(resolveTeamId('Cape Verde', teams)).toBe('cpv');
    expect(resolveTeamId('Iran', teams)).toBe('irn');
    expect(resolveTeamId('United States', teams)).toBe('usa');
    expect(resolveTeamId('Czech Republic', teams)).toBe('cze');
    // TheSportsDB の "Bosnia-Herzegovina"（"and" 無し・ハイフン）。
    expect(resolveTeamId('Bosnia-Herzegovina', teams)).toBe('bih');
  });

  it('大文字小文字・前後空白を無視する', () => {
    expect(resolveTeamId('  brazil ', teams)).toBe('bra');
  });

  it('未知のチーム名は null', () => {
    expect(resolveTeamId('Atlantis', teams)).toBeNull();
    expect(resolveTeamId('', teams)).toBeNull();
  });
});
