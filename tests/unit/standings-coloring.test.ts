import { describe, expect, it } from 'vitest';

import type { GroupStanding } from '@/lib/standings';
import {
  isGroupStageComplete,
  resolveThirdPlaceQualification,
  type GroupStandingsEntry,
} from '@/lib/round-of-32';
import type { GroupLetter } from '@/lib/third-place';

const GROUP_LETTERS: GroupLetter[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
];

/** position と points を指定して 1 行作る（他の数値は判定に無関係なので最小限）。 */
function row(teamId: string, position: number, points: number, played = 3): GroupStanding {
  return {
    teamId,
    played,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: points, // 得点をポイントに合わせ、得失点タイブレークも安定方向にしておく
    goalsAgainst: 0,
    goalDifference: points,
    points,
    position,
  };
}

/**
 * 1グループ分の順位表を作る。thirdPoints で 3 位の勝点を制御し、
 * ベスト3位ランキングの順序をテストから操作できるようにする。
 */
function group(
  letter: GroupLetter,
  thirdPoints: number,
  { played = 3 }: { played?: number } = {},
): GroupStandingsEntry {
  return {
    group: letter,
    standings: [
      row(`${letter}1`, 1, 9, played),
      row(`${letter}2`, 2, 6, played),
      row(`${letter}3`, 3, thirdPoints, played),
      row(`${letter}4`, 4, 0, played),
    ],
  };
}

/** 12グループを作る。各 3 位の勝点は letter のインデックス降順（A が最強）。 */
function completeTwelveGroups(): GroupStandingsEntry[] {
  return GROUP_LETTERS.map((letter, i) => group(letter, 12 - i)); // A=12 ... L=1
}

describe('isGroupStageComplete', () => {
  it('全12組とも各チーム3試合消化なら true', () => {
    expect(isGroupStageComplete(completeTwelveGroups())).toBe(true);
  });

  it('1組でも未消化（played<3）があれば false', () => {
    const groups = completeTwelveGroups();
    groups[5] = group('F', 7, { played: 2 }); // F が 2 試合しか消化していない
    expect(isGroupStageComplete(groups)).toBe(false);
  });

  it('12組に満たなければ false', () => {
    expect(isGroupStageComplete(completeTwelveGroups().slice(0, 11))).toBe(false);
  });
});

describe('resolveThirdPlaceQualification', () => {
  it('未確定（全消化前）は全グループ null を返す', () => {
    const groups = completeTwelveGroups();
    groups[0] = group('A', 12, { played: 1 });
    const result = resolveThirdPlaceQualification(groups);
    expect([...result.values()].every((v) => v === null)).toBe(true);
  });

  it('確定後はベスト3位上位8グループが true・残り4グループが false', () => {
    const result = resolveThirdPlaceQualification(completeTwelveGroups());
    // A..H が上位8（3位勝点 12..5）→ true、I..L（4..1）→ false
    const qualified = (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as GroupLetter[]);
    const eliminated = (['I', 'J', 'K', 'L'] as GroupLetter[]);
    for (const g of qualified) expect(result.get(g)).toBe(true);
    for (const g of eliminated) expect(result.get(g)).toBe(false);
  });

  it('ちょうど8グループが通過する（true の数が 8）', () => {
    const result = resolveThirdPlaceQualification(completeTwelveGroups());
    const trues = [...result.values()].filter((v) => v === true).length;
    expect(trues).toBe(8);
  });
});
