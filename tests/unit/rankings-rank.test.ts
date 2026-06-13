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
