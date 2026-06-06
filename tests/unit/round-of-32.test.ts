import { describe, expect, it } from 'vitest';

import type { GroupStanding } from '@/lib/standings';
import {
  rankThirdPlacedTeams,
  resolveRoundOf32Assignments,
  type GroupStandingsEntry,
  type RoundOf32Slot,
} from '@/lib/round-of-32';
import type { GroupLetter } from '@/lib/third-place';

const ALL_GROUPS: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

/** position に応じたダミー順位行。teamId は `${group}${position}`（例 A1, A2…）。 */
function standing(
  group: GroupLetter,
  position: number,
  overrides: Partial<GroupStanding> = {},
): GroupStanding {
  return {
    teamId: `${group}${position}`,
    played: 3,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    position,
    ...overrides,
  };
}

/** 1グループ4チーム分（position 1..4）の順位表を作る。 */
function groupStandings(
  group: GroupLetter,
  thirdOverrides: Partial<GroupStanding> = {},
): GroupStandingsEntry {
  return {
    group,
    standings: [
      standing(group, 1),
      standing(group, 2),
      standing(group, 3, thirdOverrides),
      standing(group, 4),
    ],
  };
}

/** 12グループ分。3位の強さ（points）をグループごとに変えられる。 */
function twelveGroups(thirdPoints?: Partial<Record<GroupLetter, number>>): GroupStandingsEntry[] {
  return ALL_GROUPS.map((g) =>
    groupStandings(g, thirdPoints?.[g] !== undefined ? { points: thirdPoints[g]! } : {}),
  );
}

describe('rankThirdPlacedTeams', () => {
  it('勝点 → 得失点差 → 総得点 → グループ昇順 で降順整列する', () => {
    const groups: GroupStandingsEntry[] = [
      groupStandings('A', { points: 3, goalDifference: 0, goalsFor: 1 }),
      groupStandings('B', { points: 6, goalDifference: 1, goalsFor: 2 }),
      groupStandings('C', { points: 3, goalDifference: 2, goalsFor: 2 }),
      groupStandings('D', { points: 3, goalDifference: 0, goalsFor: 3 }),
    ];
    const ranked = rankThirdPlacedTeams(groups).map((r) => r.group);
    // B(6) > C(3,gd2) > D(3,gd0,gf3) > A(3,gd0,gf1)
    expect(ranked).toEqual(['B', 'C', 'D', 'A']);
  });

  it('完全同点はグループ文字の昇順で安定化（決定性）', () => {
    const groups: GroupStandingsEntry[] = [
      groupStandings('C'),
      groupStandings('A'),
      groupStandings('B'),
    ];
    expect(rankThirdPlacedTeams(groups).map((r) => r.group)).toEqual(['A', 'B', 'C']);
  });

  it('3位が存在しないグループ（順位表不足）は除外する', () => {
    const groups: GroupStandingsEntry[] = [
      { group: 'A', standings: [standing('A', 1), standing('A', 2)] }, // 3位なし
      groupStandings('B'),
    ];
    expect(rankThirdPlacedTeams(groups).map((r) => r.group)).toEqual(['B']);
  });
});

// seed-matches.ts の R32 全16試合スロット（home/away）。テストの真値。
const R32_SLOTS: RoundOf32Slot[] = [
  { matchId: 73, side: 'home', slot: 'Group A runners-up' },
  { matchId: 73, side: 'away', slot: 'Group B runners-up' },
  { matchId: 74, side: 'home', slot: 'Group E winners' },
  { matchId: 74, side: 'away', slot: 'Group A/B/C/D/F third place' },
  { matchId: 75, side: 'home', slot: 'Group F winners' },
  { matchId: 75, side: 'away', slot: 'Group C runners-up' },
  { matchId: 76, side: 'home', slot: 'Group C winners' },
  { matchId: 76, side: 'away', slot: 'Group F runners-up' },
  { matchId: 77, side: 'home', slot: 'Group I winners' },
  { matchId: 77, side: 'away', slot: 'Group C/D/F/G/H third place' },
  { matchId: 78, side: 'home', slot: 'Group E runners-up' },
  { matchId: 78, side: 'away', slot: 'Group I runners-up' },
  { matchId: 79, side: 'home', slot: 'Group A winners' },
  { matchId: 79, side: 'away', slot: 'Group C/E/F/H/I third place' },
  { matchId: 80, side: 'home', slot: 'Group L winners' },
  { matchId: 80, side: 'away', slot: 'Group E/H/I/J/K third place' },
  { matchId: 81, side: 'home', slot: 'Group D winners' },
  { matchId: 81, side: 'away', slot: 'Group B/E/F/I/J third place' },
  { matchId: 82, side: 'home', slot: 'Group G winners' },
  { matchId: 82, side: 'away', slot: 'Group A/E/H/I/J third place' },
  { matchId: 83, side: 'home', slot: 'Group K runners-up' },
  { matchId: 83, side: 'away', slot: 'Group L runners-up' },
  { matchId: 84, side: 'home', slot: 'Group H winners' },
  { matchId: 84, side: 'away', slot: 'Group J runners-up' },
  { matchId: 85, side: 'home', slot: 'Group B winners' },
  { matchId: 85, side: 'away', slot: 'Group E/F/G/I/J third place' },
  { matchId: 86, side: 'home', slot: 'Group J winners' },
  { matchId: 86, side: 'away', slot: 'Group H runners-up' },
  { matchId: 87, side: 'home', slot: 'Group K winners' },
  { matchId: 87, side: 'away', slot: 'Group D/E/I/J/L third place' },
  { matchId: 88, side: 'home', slot: 'Group D runners-up' },
  { matchId: 88, side: 'away', slot: 'Group G runners-up' },
];

describe('resolveRoundOf32Assignments', () => {
  it('1位/2位スロットを該当グループ順位表から解決する', () => {
    const result = resolveRoundOf32Assignments(R32_SLOTS, twelveGroups());
    const find = (matchId: number, side: 'home' | 'away') =>
      result.find((r) => r.matchId === matchId && r.side === side)!;

    // 試合73: A2 vs B2（runners-up）
    expect(find(73, 'home').teamId).toBe('A2');
    expect(find(73, 'away').teamId).toBe('B2');
    // 試合74 home: E winners → E1
    expect(find(74, 'home').teamId).toBe('E1');
    // 試合76: C winners=C1 / F runners-up=F2
    expect(find(76, 'home').teamId).toBe('C1');
    expect(find(76, 'away').teamId).toBe('F2');
    // 試合84 away: J runners-up=J2
    expect(find(84, 'away').teamId).toBe('J2');
  });

  it('3位スロットを FIFA 割当どおり（通過グループの3位 teamId）に解決する', () => {
    // 3位の強さを操作し、通過8グループを A,B,C,D,E,F,G,H に固定する
    // （I,J,K,L の3位を弱く＝points 0、A..H の3位を points 3 に）。
    const groups = twelveGroups({
      A: 3, B: 3, C: 3, D: 3, E: 3, F: 3, G: 3, H: 3,
      I: 0, J: 0, K: 0, L: 0,
    });
    const result = resolveRoundOf32Assignments(R32_SLOTS, groups);
    const thirdOf = (matchId: number) =>
      result.find((r) => r.matchId === matchId && r.side === 'away')!.teamId;

    // 通過 ABCDEFGH の割当（third-place.test と同じ真値）:
    //   1E(74)=3C, 1I(77)=3F, 1A(79)=3H, 1L(80)=3E, 1D(81)=3B, 1G(82)=3A, 1B(85)=3G, 1K(87)=3D
    // teamId は `${group}3`。
    expect(thirdOf(74)).toBe('C3');
    expect(thirdOf(77)).toBe('F3');
    expect(thirdOf(79)).toBe('H3');
    expect(thirdOf(80)).toBe('E3');
    expect(thirdOf(81)).toBe('B3');
    expect(thirdOf(82)).toBe('A3');
    expect(thirdOf(85)).toBe('G3');
    expect(thirdOf(87)).toBe('D3');
  });

  it('3位スロットの teamId 集合は「通過した8グループの3位」と過不足なく一致する', () => {
    const groups = twelveGroups({
      A: 3, B: 3, C: 3, D: 3, E: 3, F: 3, G: 3, H: 3,
      I: 0, J: 0, K: 0, L: 0,
    });
    const result = resolveRoundOf32Assignments(R32_SLOTS, groups);
    const thirdTeamIds = result
      .filter((r) => /third place$/i.test(r.slot))
      .map((r) => r.teamId)
      .sort();
    expect(thirdTeamIds).toEqual(['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3']);
  });

  it('3位が8グループ未満なら third place スロットは全て null（部分適用）', () => {
    // 9グループだけ順位表を与える → 3位は9だが、ここでは敢えて3位を8未満に絞る:
    // 4グループのみ3位を持たせる。
    const partial: GroupStandingsEntry[] = ALL_GROUPS.slice(0, 4).map((g) => groupStandings(g));
    const result = resolveRoundOf32Assignments(R32_SLOTS, partial);
    const thirds = result.filter((r) => /third place$/i.test(r.slot));
    expect(thirds.length).toBe(8);
    expect(thirds.every((r) => r.teamId === null)).toBe(true);
    // ただし与えたグループの 1位/2位は解決される（部分適用の確認）。
    expect(result.find((r) => r.matchId === 73 && r.side === 'home')!.teamId).toBe('A2');
  });

  it('結果は入力スロットと1:1（件数・matchId/side 保持）', () => {
    const result = resolveRoundOf32Assignments(R32_SLOTS, twelveGroups());
    expect(result.length).toBe(R32_SLOTS.length);
    expect(result.map((r) => `${r.matchId}-${r.side}`)).toEqual(
      R32_SLOTS.map((s) => `${s.matchId}-${s.side}`),
    );
  });
});
