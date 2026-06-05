import { describe, expect, it } from 'vitest';

import type { Match, TeamRating } from '@/db/queries';
import {
  combineFactors,
  computeFactorScores,
  type FactorScores,
  type FactorToggles,
} from '@/lib/champion-prediction';

function teamRating(id: string, opts: Partial<TeamRating> = {}): TeamRating {
  return {
    id,
    nameJa: id,
    nameEn: id,
    fifaCode: id.toUpperCase(),
    flag: '🏳️',
    groupName: 'Group A',
    fifaRank: 50,
    wc2014Place: null,
    wc2018Place: null,
    wc2022Place: null,
    ...opts,
  };
}

type MatchInput = {
  id: number;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status?: Match['status'];
  stage?: string;
};

function match({
  id,
  home,
  away,
  homeScore,
  awayScore,
  status = 'finished',
  stage = 'group_stage',
}: MatchInput): Match {
  const winnerTeamId =
    status === 'finished' && homeScore !== null && awayScore !== null && homeScore !== awayScore
      ? homeScore > awayScore
        ? home
        : away
      : null;
  return {
    id,
    stage,
    matchDate: '2026-06-11',
    kickoffAt: null,
    venueId: 'v1',
    homeSlot: 'A1',
    awaySlot: 'A2',
    homeTeamId: home,
    awayTeamId: away,
    homeScore,
    awayScore,
    winnerTeamId,
    status,
    groupLetter: stage === 'group_stage' ? 'A' : null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function sum(map: Map<string, number>): number {
  let total = 0;
  for (const v of map.values()) total += v;
  return total;
}

const TOLERANCE = 1e-9;

describe('computeFactorScores', () => {
  it('各 factor の分布は合計が 1 になる', () => {
    const teams = [
      teamRating('a', { fifaRank: 1, wc2022Place: 1 }),
      teamRating('b', { fifaRank: 10, wc2018Place: 16 }),
      teamRating('c', { fifaRank: 30 }),
    ];
    const matches = [match({ id: 1, home: 'a', away: 'b', homeScore: 2, awayScore: 0 })];

    const factors = computeFactorScores(teams, matches);

    expect(sum(factors.pastWorldCup)).toBeCloseTo(1, 9);
    expect(sum(factors.fifaRank)).toBeCloseTo(1, 9);
    expect(sum(factors.wc2026)).toBeCloseTo(1, 9);
  });

  it('全 factor のすべての値が 0 より大きい（ゼロ保護）', () => {
    const teams = [
      teamRating('a', { fifaRank: 1, wc2022Place: 1 }),
      // どの大会にも出ておらず、最下位ランクで試合もしていないチーム
      teamRating('z', { fifaRank: 48 }),
    ];
    const factors = computeFactorScores(teams, []);

    for (const key of ['pastWorldCup', 'fifaRank', 'wc2026'] as const) {
      for (const v of factors[key].values()) {
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it('過去W杯: 上位入賞のチームは未出場のチームより高い', () => {
    const teams = [
      teamRating('winner', { wc2014Place: 1, wc2018Place: 1, wc2022Place: 1 }),
      teamRating('absent'),
    ];
    const factors = computeFactorScores(teams, []);

    expect(factors.pastWorldCup.get('winner')!).toBeGreaterThan(
      factors.pastWorldCup.get('absent')!,
    );
  });

  it('過去W杯: 同一順位なら大会数が多いほど高い（フラット平均で直近重み無し）', () => {
    const teams = [
      teamRating('three', { wc2014Place: 4, wc2018Place: 4, wc2022Place: 4 }),
      teamRating('one', { wc2022Place: 4 }),
    ];
    const factors = computeFactorScores(teams, []);

    expect(factors.pastWorldCup.get('three')!).toBeGreaterThan(
      factors.pastWorldCup.get('one')!,
    );
  });

  it('FIFAランク: ランク数値が小さい（強い）ほど高スコア', () => {
    const teams = [
      teamRating('top', { fifaRank: 1 }),
      teamRating('mid', { fifaRank: 20 }),
      teamRating('low', { fifaRank: 48 }),
    ];
    const factors = computeFactorScores(teams, []);

    expect(factors.fifaRank.get('top')!).toBeGreaterThan(factors.fifaRank.get('mid')!);
    expect(factors.fifaRank.get('mid')!).toBeGreaterThan(factors.fifaRank.get('low')!);
  });

  it('2026成績: 試合が1つも終わっていないときは全チーム均等（中立）', () => {
    const teams = [teamRating('a'), teamRating('b'), teamRating('c')];
    const factors = computeFactorScores(teams, []);

    const values = [...factors.wc2026.values()];
    for (const v of values) {
      expect(v).toBeCloseTo(1 / 3, 9);
    }
  });

  it('2026成績: 予定試合(scheduled)は集計せず均等のまま', () => {
    const teams = [teamRating('a'), teamRating('b')];
    const matches = [
      match({ id: 1, home: 'a', away: 'b', homeScore: null, awayScore: null, status: 'scheduled' }),
    ];
    const factors = computeFactorScores(teams, matches);

    expect(factors.wc2026.get('a')!).toBeCloseTo(0.5, 9);
    expect(factors.wc2026.get('b')!).toBeCloseTo(0.5, 9);
  });

  it('2026成績: 勝ち数が多いチームほど高い（決勝Tの勝利も加算）', () => {
    const teams = [teamRating('a'), teamRating('b'), teamRating('c')];
    const matches = [
      match({ id: 1, home: 'a', away: 'b', homeScore: 1, awayScore: 0 }),
      match({ id: 2, home: 'a', away: 'c', homeScore: 2, awayScore: 0, stage: 'round_of_32' }),
      match({ id: 3, home: 'b', away: 'c', homeScore: 1, awayScore: 0 }),
    ];
    const factors = computeFactorScores(teams, matches);

    expect(factors.wc2026.get('a')!).toBeGreaterThan(factors.wc2026.get('b')!);
    expect(factors.wc2026.get('b')!).toBeGreaterThan(factors.wc2026.get('c')!);
  });

  it('みんなの予想: 投票ゼロのときは均等（中立）', () => {
    const teams = [teamRating('a'), teamRating('b'), teamRating('c')];
    const factors = computeFactorScores(teams, [], new Map());
    for (const v of factors.crowd.values()) {
      expect(v).toBeCloseTo(1 / 3, 9);
    }
  });

  it('みんなの予想: 票が多いチームほど高い、分布合計は1', () => {
    const teams = [teamRating('a'), teamRating('b'), teamRating('c')];
    const crowd = new Map([
      ['a', 10],
      ['b', 2],
    ]);
    const factors = computeFactorScores(teams, [], crowd);
    expect(sum(factors.crowd)).toBeCloseTo(1, 9);
    expect(factors.crowd.get('a')!).toBeGreaterThan(factors.crowd.get('b')!);
    expect(factors.crowd.get('b')!).toBeGreaterThan(factors.crowd.get('c')!);
  });

  it('過去W杯の順位正規化は32チーム大会の最下位(32)でも破綻しない', () => {
    const teams = [
      teamRating('best', { wc2022Place: 1 }),
      teamRating('worst', { wc2022Place: 32 }),
    ];
    const factors = computeFactorScores(teams, []);

    expect(factors.pastWorldCup.get('best')!).toBeGreaterThan(
      factors.pastWorldCup.get('worst')!,
    );
    expect(factors.pastWorldCup.get('worst')!).toBeGreaterThan(0);
  });
});

describe('combineFactors', () => {
  function buildFactors(): FactorScores {
    const teams = [
      teamRating('a', { fifaRank: 1, wc2022Place: 1 }),
      teamRating('b', { fifaRank: 20, wc2018Place: 16 }),
      teamRating('c', { fifaRank: 40 }),
    ];
    const matches = [match({ id: 1, home: 'a', away: 'b', homeScore: 3, awayScore: 0 })];
    return computeFactorScores(teams, matches);
  }

  const ALL_ON: FactorToggles = {
    pastWorldCup: true,
    fifaRank: true,
    wc2026: true,
    crowd: true,
  };

  it('結果の確率は合計が 1 で、降順にソートされている', () => {
    const ranked = combineFactors(buildFactors(), ALL_ON);

    const total = ranked.reduce((acc, r) => acc + r.probability, 0);
    expect(total).toBeCloseTo(1, 9);

    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1].probability).toBeGreaterThanOrEqual(ranked[i].probability - TOLERANCE);
    }
  });

  it('1つの factor だけ ON のとき、その factor の分布と一致する', () => {
    const factors = buildFactors();
    const ranked = combineFactors(factors, {
      pastWorldCup: false,
      fifaRank: true,
      wc2026: false,
      crowd: false,
    });

    for (const r of ranked) {
      expect(r.probability).toBeCloseTo(factors.fifaRank.get(r.teamId)!, 9);
    }
  });

  it('全 factor OFF のときは均等（uniform）になる', () => {
    const factors = buildFactors();
    const ranked = combineFactors(factors, {
      pastWorldCup: false,
      fifaRank: false,
      wc2026: false,
      crowd: false,
    });

    const n = ranked.length;
    for (const r of ranked) {
      expect(r.probability).toBeCloseTo(1 / n, 9);
    }
  });

  it('3 factor すべてで優位なチームが1位になる', () => {
    const ranked = combineFactors(buildFactors(), ALL_ON);
    expect(ranked[0].teamId).toBe('a');
  });

  it('どの factor でも弱いチームでも確率は 0 にならない', () => {
    const ranked = combineFactors(buildFactors(), ALL_ON);
    for (const r of ranked) {
      expect(r.probability).toBeGreaterThan(0);
    }
  });

  it('みんなの予想だけ ON のとき、投票分布と一致する', () => {
    const teams = [teamRating('a'), teamRating('b'), teamRating('c')];
    const factors = computeFactorScores(teams, [], new Map([['a', 8], ['b', 2]]));
    const ranked = combineFactors(factors, {
      pastWorldCup: false,
      fifaRank: false,
      wc2026: false,
      crowd: true,
    });
    for (const r of ranked) {
      expect(r.probability).toBeCloseTo(factors.crowd.get(r.teamId)!, 9);
    }
    expect(ranked[0].teamId).toBe('a');
  });

  it('各チームの components に factor 別スコアが入る', () => {
    const factors = buildFactors();
    const ranked = combineFactors(factors, ALL_ON);
    const a = ranked.find((r) => r.teamId === 'a')!;
    expect(a.components.fifaRank).toBeCloseTo(factors.fifaRank.get('a')!, 9);
    expect(a.components.pastWorldCup).toBeCloseTo(factors.pastWorldCup.get('a')!, 9);
    expect(a.components.wc2026).toBeCloseTo(factors.wc2026.get('a')!, 9);
  });
});
