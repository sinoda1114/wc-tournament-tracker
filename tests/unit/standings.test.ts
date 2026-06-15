import { describe, expect, it } from 'vitest';

import type { Match, Team } from '@/db/queries';
import { calculateGroupStandings } from '@/lib/standings';

function team(id: string, code: string): Team {
  return {
    id,
    nameJa: id,
    nameEn: id,
    fifaCode: code,
    flag: '🏳️',
    groupName: 'Group A',
  };
}

type MatchInput = {
  id: number;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status?: Match['status'];
};

function match({
  id,
  home,
  away,
  homeScore,
  awayScore,
  status = 'finished',
}: MatchInput): Match {
  const winnerTeamId =
    status === 'finished' && homeScore !== null && awayScore !== null && homeScore !== awayScore
      ? homeScore > awayScore
        ? home
        : away
      : null;
  return {
    id,
    stage: 'group_stage',
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
    groupLetter: 'A',
    highlightSummary: null,
    highlightUrl: null,
    highlightSourceLabel: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

const A = team('a', 'AAA');
const B = team('b', 'BBB');
const C = team('c', 'CCC');
const D = team('d', 'DDD');

describe('calculateGroupStandings', () => {
  it('determines final standings for a fully completed group (basic case)', () => {
    // A beats B 2-0, A beats C 1-0, A draws D 0-0 -> 7pts
    // D beats B 3-0, D beats C 1-0, D draws A 0-0 -> 7pts (but lower GF)
    // Actually let's design it cleanly: A wins all (9pts), B 6pts, C 3pts, D 0pts.
    const matches: Match[] = [
      match({ id: 1, home: 'a', away: 'b', homeScore: 2, awayScore: 0 }),
      match({ id: 2, home: 'c', away: 'd', homeScore: 1, awayScore: 0 }),
      match({ id: 3, home: 'a', away: 'c', homeScore: 1, awayScore: 0 }),
      match({ id: 4, home: 'b', away: 'd', homeScore: 1, awayScore: 0 }),
      match({ id: 5, home: 'a', away: 'd', homeScore: 3, awayScore: 0 }),
      match({ id: 6, home: 'b', away: 'c', homeScore: 2, awayScore: 0 }),
    ];

    const standings = calculateGroupStandings([A, B, C, D], matches);

    expect(standings.map((s) => s.teamId)).toEqual(['a', 'b', 'c', 'd']);
    expect(standings.map((s) => s.position)).toEqual([1, 2, 3, 4]);
    expect(standings[0].points).toBe(9);
    expect(standings[0].wins).toBe(3);
    expect(standings[0].goalsFor).toBe(6);
    expect(standings[0].goalsAgainst).toBe(0);
    expect(standings[0].goalDifference).toBe(6);
    expect(standings[3].points).toBe(0);
    expect(standings[3].losses).toBe(3);
  });

  it('breaks ties on goal difference when points are equal', () => {
    // A と B はともに W1 L1 D1 = 4pts。GD だけが差。
    // A: 4-0 勝, 0-1 負, 0-0 分 -> 4pts GF=4 GA=1 GD=+3
    // B: 1-0 勝, 0-2 負, 0-0 分 -> 4pts GF=1 GA=2 GD=-1
    const matches: Match[] = [
      match({ id: 1, home: 'a', away: 'c', homeScore: 4, awayScore: 0 }),
      match({ id: 2, home: 'd', away: 'a', homeScore: 1, awayScore: 0 }),
      match({ id: 3, home: 'a', away: 'b', homeScore: 0, awayScore: 0 }),
      match({ id: 4, home: 'b', away: 'd', homeScore: 1, awayScore: 0 }),
      match({ id: 5, home: 'c', away: 'b', homeScore: 2, awayScore: 0 }),
      match({ id: 6, home: 'c', away: 'd', homeScore: 0, awayScore: 0 }),
    ];

    const standings = calculateGroupStandings([A, B, C, D], matches);
    // Verify A=4pts GD=+3 above B=4pts GD=-1
    const a = standings.find((s) => s.teamId === 'a')!;
    const b = standings.find((s) => s.teamId === 'b')!;
    expect(a.points).toBe(4);
    expect(b.points).toBe(4);
    expect(a.goalDifference).toBeGreaterThan(b.goalDifference);
    expect(a.position).toBeLessThan(b.position);
  });

  it('breaks ties on goals for when points and GD are equal', () => {
    // 同 pts, 同 GD, GF だけが違う。
    // A: 4-2 勝, 1-3 負, 0-0 分 -> 4pts GF=5 GA=5 GD=0
    // B: 2-0 勝, 0-2 負, 0-0 分 -> 4pts GF=2 GA=2 GD=0
    const matches: Match[] = [
      // A v C: 4-2 (A wins)
      match({ id: 1, home: 'a', away: 'c', homeScore: 4, awayScore: 2 }),
      // A v D: 1-3 (D wins)
      match({ id: 2, home: 'a', away: 'd', homeScore: 1, awayScore: 3 }),
      // A v B: 0-0 (draw)
      match({ id: 3, home: 'a', away: 'b', homeScore: 0, awayScore: 0 }),
      // B v C: 2-0 (B wins)
      match({ id: 4, home: 'b', away: 'c', homeScore: 2, awayScore: 0 }),
      // B v D: 0-2 (D wins)
      match({ id: 5, home: 'b', away: 'd', homeScore: 0, awayScore: 2 }),
      // C v D: dummy
      match({ id: 6, home: 'c', away: 'd', homeScore: 0, awayScore: 0 }),
    ];

    const standings = calculateGroupStandings([A, B, C, D], matches);
    const a = standings.find((s) => s.teamId === 'a')!;
    const b = standings.find((s) => s.teamId === 'b')!;
    expect(a.points).toBe(b.points);
    expect(a.goalDifference).toBe(b.goalDifference);
    expect(a.goalsFor).toBeGreaterThan(b.goalsFor);
    expect(a.position).toBeLessThan(b.position);
  });

  it('breaks ties on head-to-head when all overall stats are equal', () => {
    // A and B both: 1 win, 1 loss, 1 draw, GF=GA=1, GD=0. Plus they meet each other.
    // Design: A beats B 1-0 (h2h tilts to A).
    // A: vs B 1-0 (W), vs C 0-1 (L), vs D 0-0 (D)  -> 4pts GF=1 GA=1 GD=0
    // B: vs A 0-1 (L), vs C 1-0 (W), vs D 0-0 (D)  -> 4pts GF=1 GA=1 GD=0
    // Both identical except h2h favors A.
    const matches: Match[] = [
      match({ id: 1, home: 'a', away: 'b', homeScore: 1, awayScore: 0 }),
      match({ id: 2, home: 'a', away: 'c', homeScore: 0, awayScore: 1 }),
      match({ id: 3, home: 'a', away: 'd', homeScore: 0, awayScore: 0 }),
      match({ id: 4, home: 'b', away: 'c', homeScore: 1, awayScore: 0 }),
      match({ id: 5, home: 'b', away: 'd', homeScore: 0, awayScore: 0 }),
      match({ id: 6, home: 'c', away: 'd', homeScore: 0, awayScore: 0 }),
    ];

    const standings = calculateGroupStandings([A, B, C, D], matches);
    const a = standings.find((s) => s.teamId === 'a')!;
    const b = standings.find((s) => s.teamId === 'b')!;
    expect(a.points).toBe(b.points);
    expect(a.goalDifference).toBe(b.goalDifference);
    expect(a.goalsFor).toBe(b.goalsFor);
    expect(a.position).toBeLessThan(b.position); // h2h breaks the tie -> A above B
  });

  it('ignores matches whose status is not finished', () => {
    const matches: Match[] = [
      // Finished: A beats B 1-0
      match({ id: 1, home: 'a', away: 'b', homeScore: 1, awayScore: 0, status: 'finished' }),
      // In progress: scores set but should be ignored
      match({ id: 2, home: 'c', away: 'd', homeScore: 5, awayScore: 0, status: 'in_progress' }),
      // Scheduled: nulls
      match({ id: 3, home: 'a', away: 'c', homeScore: null, awayScore: null, status: 'scheduled' }),
    ];

    const standings = calculateGroupStandings([A, B, C, D], matches);
    const a = standings.find((s) => s.teamId === 'a')!;
    const b = standings.find((s) => s.teamId === 'b')!;
    const c = standings.find((s) => s.teamId === 'c')!;
    const d = standings.find((s) => s.teamId === 'd')!;
    expect(a.points).toBe(3);
    expect(a.played).toBe(1);
    expect(b.played).toBe(1);
    expect(c.played).toBe(0);
    expect(d.played).toBe(0);
    expect(c.points).toBe(0);
    expect(d.points).toBe(0);
  });

  it('handles all-draws gracefully (each team earns equal points)', () => {
    const matches: Match[] = [
      match({ id: 1, home: 'a', away: 'b', homeScore: 0, awayScore: 0 }),
      match({ id: 2, home: 'a', away: 'c', homeScore: 0, awayScore: 0 }),
      match({ id: 3, home: 'a', away: 'd', homeScore: 0, awayScore: 0 }),
      match({ id: 4, home: 'b', away: 'c', homeScore: 0, awayScore: 0 }),
      match({ id: 5, home: 'b', away: 'd', homeScore: 0, awayScore: 0 }),
      match({ id: 6, home: 'c', away: 'd', homeScore: 0, awayScore: 0 }),
    ];

    const standings = calculateGroupStandings([A, B, C, D], matches);
    for (const s of standings) {
      expect(s.points).toBe(3);
      expect(s.draws).toBe(3);
      expect(s.played).toBe(3);
      expect(s.goalDifference).toBe(0);
    }
    // Positions are 1..4 (order is implementation-defined for total ties)
    expect(standings.map((s) => s.position).sort()).toEqual([1, 2, 3, 4]);
  });

  it('returns zero stats when no matches have been finished yet', () => {
    const matches: Match[] = [
      match({ id: 1, home: 'a', away: 'b', homeScore: null, awayScore: null, status: 'scheduled' }),
      match({ id: 2, home: 'c', away: 'd', homeScore: null, awayScore: null, status: 'scheduled' }),
    ];

    const standings = calculateGroupStandings([A, B, C, D], matches);
    expect(standings).toHaveLength(4);
    for (const s of standings) {
      expect(s.played).toBe(0);
      expect(s.points).toBe(0);
      expect(s.wins).toBe(0);
      expect(s.draws).toBe(0);
      expect(s.losses).toBe(0);
      expect(s.goalsFor).toBe(0);
      expect(s.goalsAgainst).toBe(0);
      expect(s.goalDifference).toBe(0);
    }
    expect(standings.map((s) => s.position).sort()).toEqual([1, 2, 3, 4]);
  });

  it('resolves three-way tie via head-to-head sub-table', () => {
    // A, B, C を rock-paper-scissors にする: A→B, B→C, C→A 全て 1-0。
    // 各チームは vs D 0-0 で 1pt 追加 → A/B/C すべて W1 L1 D1 = 4pts, GF=1, GA=1, GD=0。
    // D は 3 引き分け = 3pts。
    // h2h 内も完全に対称なので最終的な並びは実装依存。
    // よってここでは A/B/C の全 stats 同一・position が unique にちゃんと割り振られることだけを検証する。
    const matches: Match[] = [
      match({ id: 1, home: 'a', away: 'b', homeScore: 1, awayScore: 0 }),
      match({ id: 2, home: 'b', away: 'c', homeScore: 1, awayScore: 0 }),
      match({ id: 3, home: 'c', away: 'a', homeScore: 1, awayScore: 0 }),
      match({ id: 4, home: 'a', away: 'd', homeScore: 0, awayScore: 0 }),
      match({ id: 5, home: 'b', away: 'd', homeScore: 0, awayScore: 0 }),
      match({ id: 6, home: 'c', away: 'd', homeScore: 0, awayScore: 0 }),
    ];

    const standings = calculateGroupStandings([A, B, C, D], matches);
    const a = standings.find((s) => s.teamId === 'a')!;
    const b = standings.find((s) => s.teamId === 'b')!;
    const c = standings.find((s) => s.teamId === 'c')!;
    const d = standings.find((s) => s.teamId === 'd')!;

    // A, B, C are all 4pts (W1 L1 D1), GF=GA=1, GD=0.
    expect(a.points).toBe(4);
    expect(b.points).toBe(4);
    expect(c.points).toBe(4);
    expect(a.goalDifference).toBe(0);
    expect(b.goalDifference).toBe(0);
    expect(c.goalDifference).toBe(0);
    // D は1勝点 (3引き分け)
    expect(d.points).toBe(3);
    expect(d.draws).toBe(3);
    // Positions 1..4 should be assigned uniquely (no duplicate positions in output)
    expect(new Set(standings.map((s) => s.position)).size).toBe(4);
  });

  it('treats partial group correctly (mid-stage state)', () => {
    // Only 2 of 6 matches finished. A wins 2-0, B loses 0-2 to D.
    const matches: Match[] = [
      match({ id: 1, home: 'a', away: 'c', homeScore: 2, awayScore: 0 }),
      match({ id: 2, home: 'd', away: 'b', homeScore: 2, awayScore: 0 }),
      match({ id: 3, home: 'a', away: 'b', homeScore: null, awayScore: null, status: 'scheduled' }),
      match({ id: 4, home: 'c', away: 'd', homeScore: null, awayScore: null, status: 'scheduled' }),
    ];

    const standings = calculateGroupStandings([A, B, C, D], matches);
    const a = standings.find((s) => s.teamId === 'a')!;
    const d = standings.find((s) => s.teamId === 'd')!;
    const b = standings.find((s) => s.teamId === 'b')!;
    const c = standings.find((s) => s.teamId === 'c')!;
    expect(a.played).toBe(1);
    expect(a.points).toBe(3);
    expect(d.played).toBe(1);
    expect(d.points).toBe(3);
    expect(b.played).toBe(1);
    expect(b.points).toBe(0);
    expect(c.played).toBe(1);
    expect(c.points).toBe(0);
    // 1位2位は A/D の順、3位4位は B/C の順 (GD でタイ解決)
    expect([standings[0].teamId, standings[1].teamId].sort()).toEqual(['a', 'd']);
    expect([standings[2].teamId, standings[3].teamId].sort()).toEqual(['b', 'c']);
  });
});
