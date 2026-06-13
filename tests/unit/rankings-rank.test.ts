import { describe, expect, it } from 'vitest';

import { standardCompetitionRanks } from '@/lib/rankings';

/**
 * 標準競争順位（1-2-2-2-…-N）の検証（T-63）。
 * 同点は同順位・次の値は配列位置に繰り上げ（スキップ）。
 */
describe('standardCompetitionRanks', () => {
  it('同点を同順位にし、次の値は順位をスキップする（1-2-2-2-…）', () => {
    // 2点が1人、1点が3人 → 1, 2, 2, 2
    const items = [{ goals: 2 }, { goals: 1 }, { goals: 1 }, { goals: 1 }];
    expect(standardCompetitionRanks(items, (s) => s.goals)).toEqual([1, 2, 2, 2]);
  });

  it('値が下がるたびに配列位置へ繰り上げる', () => {
    // 3, 3, 2, 1, 1 → 1, 1, 3, 4, 4
    const items = [{ v: 3 }, { v: 3 }, { v: 2 }, { v: 1 }, { v: 1 }];
    expect(standardCompetitionRanks(items, (s) => s.v)).toEqual([1, 1, 3, 4, 4]);
  });

  it('全員同点なら全員1位', () => {
    const items = [{ v: 1 }, { v: 1 }, { v: 1 }];
    expect(standardCompetitionRanks(items, (s) => s.v)).toEqual([1, 1, 1]);
  });

  it('全員異なれば連番', () => {
    const items = [{ v: 5 }, { v: 4 }, { v: 3 }];
    expect(standardCompetitionRanks(items, (s) => s.v)).toEqual([1, 2, 3]);
  });

  it('空配列は空配列', () => {
    expect(standardCompetitionRanks([] as { v: number }[], (s) => s.v)).toEqual([]);
  });
});

/**
 * 優勝予想リストの同点同順位（T-71）。
 * タイ判定は生確率ではなく「表示値%（小数1桁）」基準。
 * 4.71% と 4.69% は表示上どちらも「4.7%」なので同順位になること。
 */
describe('優勝予想の表示値%基準タイ（T-71）', () => {
  // ChampionPrediction.displayPercentValue と同じ丸め（確率→小数1桁の%値）。
  const displayPercentValue = (probability: number) => Math.round(probability * 1000) / 10;

  it('表示上同じ%（4.7%）の2チームは同順位・次はスキップ', () => {
    // probability 降順ソート済みを想定: 4.71%, 4.69%, 4.0%
    const rows = [
      { teamId: 'KOR', probability: 0.0471 },
      { teamId: 'USA', probability: 0.0469 },
      { teamId: 'XYZ', probability: 0.04 },
    ];
    expect(standardCompetitionRanks(rows, (r) => displayPercentValue(r.probability))).toEqual([
      1, 1, 3,
    ]);
  });

  it('生確率では別でも表示値が同じなら同順位（4.7%が並ぶ）', () => {
    const rows = [
      { probability: 0.10 },
      { probability: 0.0473 },
      { probability: 0.0468 },
      { probability: 0.0466 },
    ];
    // 10.0%, 4.7%, 4.7%, 4.7% → 1, 2, 2, 2
    expect(standardCompetitionRanks(rows, (r) => displayPercentValue(r.probability))).toEqual([
      1, 2, 2, 2,
    ]);
  });
});
