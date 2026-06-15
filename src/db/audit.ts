import type { AuditGoalEvent, AuditMatchInput } from '@/lib/ingest/audit';

import { getDb } from './client';
import type { MatchStatus } from './queries';

const db = () => getDb();

type AuditMatchRow = {
  id: number;
  stage: string;
  match_date: string;
  kickoff_at: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  group_letter: string | null;
};

/** 監査対象の試合を最小カラムで取得する（detail JOIN を避けて軽量に）。 */
export async function getAuditMatches(): Promise<AuditMatchInput[]> {
  const result = await db().execute(`
    SELECT id, stage, match_date, kickoff_at, home_team_id, away_team_id,
           home_score, away_score, status, group_letter
    FROM matches
    ORDER BY id ASC
  `);
  return result.rows.map((row) => {
    const r = row as unknown as AuditMatchRow;
    return {
      id: Number(r.id),
      stage: r.stage,
      matchDate: r.match_date,
      kickoffAt: r.kickoff_at,
      homeTeamId: r.home_team_id,
      awayTeamId: r.away_team_id,
      homeScore: r.home_score,
      awayScore: r.away_score,
      status: r.status,
      groupLetter: r.group_letter,
    };
  });
}

type AuditGoalRow = {
  match_id: number;
  type: AuditGoalEvent['type'];
  team_id: string | null;
};

/** 整合監査用に得点系イベント（goal/penalty_goal/own_goal）だけを取得する。 */
export async function getAuditGoalEvents(): Promise<AuditGoalEvent[]> {
  const result = await db().execute(`
    SELECT match_id, type, team_id
    FROM match_events
    WHERE type IN ('goal', 'penalty_goal', 'own_goal')
  `);
  return result.rows.map((row) => {
    const r = row as unknown as AuditGoalRow;
    return {
      matchId: Number(r.match_id),
      type: r.type,
      teamId: r.team_id,
    };
  });
}

/** 交代イベントを1件以上持つ試合 id の集合（T-85(C)「終了なのに交代0件」検知用）。 */
export async function getAuditSubstitutionMatchIds(): Promise<Set<number>> {
  const result = await db().execute(`
    SELECT DISTINCT match_id FROM match_events WHERE type = 'substitution'
  `);
  return new Set(result.rows.map((row) => Number((row as unknown as { match_id: number }).match_id)));
}
