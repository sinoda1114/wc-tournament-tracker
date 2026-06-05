import type { MatchStatus, UpdateMatchResultInput } from '@/db/queries';

import { resolveTeamId, type ResolverTeam } from './team-resolver';
import type { NormalizedResult } from './types';

/** 突き合わせに必要な試合行の最小情報。 */
export type ReconcileMatch = {
  id: number;
  matchDate: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  stage: string;
};

/** 取得元（クラウドソース）の日付が公式から ±1 日ずれる事があるため許容する。 */
const DATE_TOLERANCE_DAYS = 1;

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

function dayDiff(a: string, b: string): number {
  const ms = Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`));
  return ms / 86_400_000;
}

/**
 * 取得結果を我々の試合行に突き合わせ、更新が必要な入力だけを生成する純関数。
 *
 * - 突き合わせは「日付 ＋ チームID無順序ペア」。両チーム確定済みの行のみ対象。
 * - 自チームの home/away 向きに合わせてスコアを割り当てる。
 * - 既に同じ結果なら更新しない（冪等）。スコアが違えば訂正として更新する。
 * - 決勝Tの同点（PK決着）は勝者をスコアから決められないためスキップ（手入力に委ねる）。
 * - 勝者は呼び出し側 `updateMatchResult` がスコア差から解決する（winnerTeamId は渡さない）。
 */
export function planMatchUpdates(
  results: NormalizedResult[],
  matches: ReconcileMatch[],
  teams: ResolverTeam[],
): UpdateMatchResultInput[] {
  // チームペア（無順序）→ 候補試合。同一ペアが複数（グループ＋稀な決勝T再戦）の
  // ことがあるため配列で持ち、突き合わせ時に日付の近さで一意化する。
  const byPair = new Map<string, ReconcileMatch[]>();
  for (const m of matches) {
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const key = pairKey(m.homeTeamId, m.awayTeamId);
    const bucket = byPair.get(key) ?? [];
    bucket.push(m);
    byPair.set(key, bucket);
  }

  const updates: UpdateMatchResultInput[] = [];
  for (const r of results) {
    if (!r.finished) continue;

    const homeId = resolveTeamId(r.homeName, teams);
    const awayId = resolveTeamId(r.awayName, teams);
    if (!homeId || !awayId) continue;

    // ペアで候補を引き、取得元日付に最も近い行（±1日以内）を採用。
    const candidates = (byPair.get(pairKey(homeId, awayId)) ?? [])
      .map((m) => ({ m, diff: dayDiff(m.matchDate, r.dateEvent) }))
      .filter((c) => c.diff <= DATE_TOLERANCE_DAYS)
      .sort((x, y) => x.diff - y.diff);
    const m = candidates[0]?.m;
    if (!m) continue;

    const sameOrientation = m.homeTeamId === homeId;
    const ourHome = sameOrientation ? r.homeScore : r.awayScore;
    const ourAway = sameOrientation ? r.awayScore : r.homeScore;
    if (ourHome === null || ourAway === null) continue;

    // 決勝Tの同点は PK 決着で、スコアだけでは勝者不明 → 手入力フォールバックに委ねる。
    if (ourHome === ourAway && m.stage !== 'group_stage') continue;

    // 冪等: 既に同じ確定結果なら更新不要。
    if (m.status === 'finished' && m.homeScore === ourHome && m.awayScore === ourAway) {
      continue;
    }

    updates.push({
      matchId: m.id,
      homeScore: ourHome,
      awayScore: ourAway,
      status: 'finished',
    });
  }

  return updates;
}
