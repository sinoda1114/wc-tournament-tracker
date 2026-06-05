import { describe, expect, it } from 'vitest';

import { seedTeams } from '@/data/seed-teams';
import type { Team } from '@/db/queries';
import {
  CONFEDERATION_ORDER,
  confederationOf,
  groupTeamsByConfederation,
} from '@/lib/confederations';

function team(fifaCode: string, nameJa: string): Team {
  return {
    id: fifaCode.toLowerCase(),
    nameJa,
    nameEn: fifaCode,
    fifaCode,
    flag: '🏳️',
    groupName: null,
  };
}

describe('confederationOf', () => {
  it('maps codes to their confederation', () => {
    expect(confederationOf('JPN')).toBe('AFC');
    expect(confederationOf('BRA')).toBe('CONMEBOL');
    expect(confederationOf('ESP')).toBe('UEFA');
    expect(confederationOf('MAR')).toBe('CAF');
    expect(confederationOf('USA')).toBe('CONCACAF');
    expect(confederationOf('NZL')).toBe('OFC');
  });

  it('is case-insensitive', () => {
    expect(confederationOf('jpn')).toBe('AFC');
  });

  it('returns null for unknown or empty codes', () => {
    expect(confederationOf('XXX')).toBeNull();
    expect(confederationOf(null)).toBeNull();
    expect(confederationOf(undefined)).toBeNull();
  });
});

describe('groupTeamsByConfederation', () => {
  it('orders sections by CONFEDERATION_ORDER and drops empty ones', () => {
    const teams = [team('JPN', '日本'), team('BRA', 'ブラジル'), team('ESP', 'スペイン')];
    const groups = groupTeamsByConfederation(teams);
    expect(groups.map((g) => g.key)).toEqual(['UEFA', 'CONMEBOL', 'AFC']);
  });

  it('sorts teams within a section by Japanese name', () => {
    const teams = [team('IRN', 'イラン'), team('JPN', '日本'), team('AUS', 'オーストラリア')];
    const groups = groupTeamsByConfederation(teams);
    const afc = groups.find((g) => g.key === 'AFC')!;
    expect(afc.teams.map((t) => t.nameJa)).toEqual(['イラン', 'オーストラリア', '日本']);
  });

  it('excludes teams with an unknown confederation', () => {
    const groups = groupTeamsByConfederation([team('JPN', '日本'), team('XXX', '謎国')]);
    const total = groups.reduce((sum, g) => sum + g.teams.length, 0);
    expect(total).toBe(1);
  });
});

describe('WC2026 seed coverage', () => {
  it('classifies every one of the 48 qualified teams', () => {
    for (const t of seedTeams) {
      expect(confederationOf(t.fifaCode), `${t.fifaCode} は未分類`).not.toBeNull();
    }
  });

  it('places all 48 teams into sections with none lost', () => {
    const teams: Team[] = seedTeams.map((t) => ({
      id: t.id,
      nameJa: t.nameJa,
      nameEn: t.nameEn,
      fifaCode: t.fifaCode,
      flag: t.flag,
      groupName: t.groupName,
    }));
    const groups = groupTeamsByConfederation(teams);
    const total = groups.reduce((sum, g) => sum + g.teams.length, 0);
    expect(total).toBe(seedTeams.length);
    expect(seedTeams.length).toBe(48);
  });

  it('keeps every section within the known order', () => {
    const teams: Team[] = seedTeams.map((t) => ({
      id: t.id,
      nameJa: t.nameJa,
      nameEn: t.nameEn,
      fifaCode: t.fifaCode,
      flag: t.flag,
      groupName: t.groupName,
    }));
    const groups = groupTeamsByConfederation(teams);
    for (const g of groups) {
      expect(CONFEDERATION_ORDER).toContain(g.key);
    }
  });
});
