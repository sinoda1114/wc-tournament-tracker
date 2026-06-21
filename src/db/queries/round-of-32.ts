/**
 * グループステージ確定 → Round of 32 入口（home/away_team_id）の DB 結線。
 *
 * 純粋な割当ロジックは `src/lib/round-of-32.ts`（FIFA 3位通過 495 通り含む）にあり、
 * 本モジュールはその純関数に「12グループの順位表」と「R32 スロット」を与え、
 * 確定した teamId だけを matches に書き戻す（冪等：変化が無いスロットは UPDATE しない）。
 *
 * 決勝T の勝ち上がり（試合の勝者→次試合）は queries.ts の propagateMatchResult /
 * bracket_edges が担当する。本モジュールはあくまで「グループ順位 → R32 入口」だけを埋める。
 *
 * 呼び出しは取り込み（lib/ingest）や管理操作の後に行う（queries.ts への循環 import 回避のため
 * queries.ts 側からは呼ばない）。
 */
import { getDb } from '@/db/client';
import { getGroupTeams, listGroupMatches } from '@/db/queries';
import {
  resolveRoundOf32Assignments,
  type GroupStandingsEntry,
  type RoundOf32Slot,
} from '@/lib/round-of-32';
import { calculateGroupStandings } from '@/lib/standings';
import type { GroupLetter } from '@/lib/third-place';

const GROUP_LETTERS: readonly GroupLetter[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
];

type R32Row = {
  id: number;
  home_slot: string;
  away_slot: string;
  home_team_id: string | null;
  away_team_id: string | null;
};

/**
 * グループ順位表を解決して R32 の home/away_team_id を埋める。
 * @returns 実際に更新したスロット数（冪等なので確定済み・変化なしは 0）。
 */
export async function resolveAndPersistRoundOf32(): Promise<{ updated: number }> {
  const db = getDb();

  // 1. 12 グループの順位表（チーム未投入のグループはスキップ）。
  const groups: GroupStandingsEntry[] = [];
  for (const group of GROUP_LETTERS) {
    const teams = await getGroupTeams(group);
    if (teams.length === 0) continue;
    const matches = await listGroupMatches(group);
    const standings = calculateGroupStandings(teams, matches);
    // matches を渡すと 1位/2位 はクリンチ（数学的確定）で解決される（T-105・グループ完了を待たない）。
    groups.push({ group, standings, matches });
  }

  // 2. R32 全試合のスロット（home/away 各 1）と現在値を取得。
  const r32 = await db.execute({
    sql: `
      SELECT id, home_slot, away_slot, home_team_id, away_team_id
      FROM matches
      WHERE stage = 'round_of_32'
      ORDER BY id ASC
    `,
  });

  const slots: RoundOf32Slot[] = [];
  const currentTeamId = new Map<string, string | null>();
  for (const row of r32.rows) {
    const r = row as unknown as R32Row;
    slots.push({ matchId: r.id, side: 'home', slot: r.home_slot });
    slots.push({ matchId: r.id, side: 'away', slot: r.away_slot });
    currentTeamId.set(`${r.id}:home`, r.home_team_id);
    currentTeamId.set(`${r.id}:away`, r.away_team_id);
  }

  // 3. 純関数で割当を解決（未確定は teamId=null）。
  const resolutions = resolveRoundOf32Assignments(slots, groups);

  // 4. 確定（非 null）かつ現在値と異なるスロットだけ UPDATE（冪等）。
  let updated = 0;
  for (const res of resolutions) {
    if (res.teamId === null) continue;
    if (currentTeamId.get(`${res.matchId}:${res.side}`) === res.teamId) continue;

    const column = res.side === 'home' ? 'home_team_id' : 'away_team_id';
    await db.execute({
      sql: `
        UPDATE matches
        SET ${column} = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
      `,
      args: [res.teamId, res.matchId],
    });
    updated += 1;
  }

  return { updated };
}
