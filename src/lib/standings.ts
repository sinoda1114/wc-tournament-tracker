import type { Match, Team } from '@/db/queries';

export type GroupStanding = {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** 1〜4。同点でタイブレーカーが解決した場合の最終順位。 */
  position: number;
};

type ScoreAccumulator = Omit<GroupStanding, 'position' | 'goalDifference'>;

const POINTS_WIN = 3;
const POINTS_DRAW = 1;
const POINTS_LOSS = 0;

function emptyAccumulator(teamId: string): ScoreAccumulator {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  };
}

/**
 * 試合に応じて両チームの累計を更新する。`status === 'finished'` 以外、
 * またはスコアが揃っていない場合は無視する。
 */
function accumulateMatch(
  match: Match,
  homeAcc: ScoreAccumulator,
  awayAcc: ScoreAccumulator,
): void {
  if (match.status !== 'finished') return;
  if (match.homeScore === null || match.awayScore === null) return;

  homeAcc.played += 1;
  awayAcc.played += 1;
  homeAcc.goalsFor += match.homeScore;
  homeAcc.goalsAgainst += match.awayScore;
  awayAcc.goalsFor += match.awayScore;
  awayAcc.goalsAgainst += match.homeScore;

  if (match.homeScore > match.awayScore) {
    homeAcc.wins += 1;
    awayAcc.losses += 1;
    homeAcc.points += POINTS_WIN;
    awayAcc.points += POINTS_LOSS;
  } else if (match.homeScore < match.awayScore) {
    awayAcc.wins += 1;
    homeAcc.losses += 1;
    awayAcc.points += POINTS_WIN;
    homeAcc.points += POINTS_LOSS;
  } else {
    homeAcc.draws += 1;
    awayAcc.draws += 1;
    homeAcc.points += POINTS_DRAW;
    awayAcc.points += POINTS_DRAW;
  }
}

type HeadToHead = {
  points: number;
  goalsFor: number;
  goalsAgainst: number;
};

/**
 * `teamIds` 内のチーム同士で行われた終了試合から、各チームの head-to-head 累計を計算する。
 */
function buildHeadToHead(
  teamIds: Set<string>,
  matches: Match[],
): Map<string, HeadToHead> {
  const h2h = new Map<string, HeadToHead>();
  for (const id of teamIds) {
    h2h.set(id, { points: 0, goalsFor: 0, goalsAgainst: 0 });
  }

  for (const match of matches) {
    if (match.status !== 'finished') continue;
    if (match.homeScore === null || match.awayScore === null) continue;
    if (!match.homeTeamId || !match.awayTeamId) continue;
    if (!teamIds.has(match.homeTeamId) || !teamIds.has(match.awayTeamId)) continue;

    const home = h2h.get(match.homeTeamId);
    const away = h2h.get(match.awayTeamId);
    if (!home || !away) continue;

    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.points += POINTS_WIN;
    } else if (match.homeScore < match.awayScore) {
      away.points += POINTS_WIN;
    } else {
      home.points += POINTS_DRAW;
      away.points += POINTS_DRAW;
    }
  }

  return h2h;
}

/**
 * FIFA タイブレーカー順 (本タスクのスコープ):
 *   1. 勝点
 *   2. 全試合得失点差
 *   3. 全試合得点数
 *   4. 直接対決グループでの勝点 → 得失点差 → 得点
 * 以降 (フェアプレー / FIFA ランキング / 抽選) は本タスクのスコープ外。
 */
export function calculateGroupStandings(
  groupTeams: Team[],
  groupMatches: Match[],
): GroupStanding[] {
  const accumulators = new Map<string, ScoreAccumulator>();
  for (const team of groupTeams) {
    accumulators.set(team.id, emptyAccumulator(team.id));
  }

  for (const match of groupMatches) {
    if (!match.homeTeamId || !match.awayTeamId) continue;
    const home = accumulators.get(match.homeTeamId);
    const away = accumulators.get(match.awayTeamId);
    if (!home || !away) continue;
    accumulateMatch(match, home, away);
  }

  type IntermediateRow = ScoreAccumulator & { goalDifference: number };
  const intermediate: IntermediateRow[] = Array.from(accumulators.values()).map(
    (acc) => ({
      ...acc,
      goalDifference: acc.goalsFor - acc.goalsAgainst,
    }),
  );

  // 1次ソート: 勝点 → 得失点差 → 得点
  intermediate.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return 0;
  });

  // 2次ソート: 上記で並びが確定しなかった「同列グループ」内で直接対決を適用
  const groupsByKey = new Map<string, IntermediateRow[]>();
  for (const row of intermediate) {
    const key = `${row.points}|${row.goalDifference}|${row.goalsFor}`;
    const bucket = groupsByKey.get(key) ?? [];
    bucket.push(row);
    groupsByKey.set(key, bucket);
  }

  for (const bucket of groupsByKey.values()) {
    if (bucket.length < 2) continue;
    const tiedIds = new Set(bucket.map((row) => row.teamId));
    const h2h = buildHeadToHead(tiedIds, groupMatches);

    bucket.sort((a, b) => {
      const ah = h2h.get(a.teamId)!;
      const bh = h2h.get(b.teamId)!;
      if (bh.points !== ah.points) return bh.points - ah.points;
      const aGd = ah.goalsFor - ah.goalsAgainst;
      const bGd = bh.goalsFor - bh.goalsAgainst;
      if (bGd !== aGd) return bGd - aGd;
      if (bh.goalsFor !== ah.goalsFor) return bh.goalsFor - ah.goalsFor;
      return 0;
    });
  }

  // バケットの新しい順序を反映して intermediate を組み直す
  const reorderedIds: string[] = [];
  const seen = new Set<string>();
  for (const row of intermediate) {
    const key = `${row.points}|${row.goalDifference}|${row.goalsFor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const bucket = groupsByKey.get(key)!;
    for (const r of bucket) reorderedIds.push(r.teamId);
  }

  const byId = new Map(intermediate.map((row) => [row.teamId, row] as const));
  return reorderedIds.map((id, index) => {
    const row = byId.get(id)!;
    return {
      teamId: row.teamId,
      played: row.played,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalDifference,
      points: row.points,
      position: index + 1,
    };
  });
}
