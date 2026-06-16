import {
  fetchGroupArticleHtml,
  lineupCoverageFromHtml,
  type LineupCoverage,
  type LineupTeamRef,
  type WikipediaLineupOptions,
} from '@/lib/lineup/wikipedia-lineup';

import type { AuditFinding } from './audit';

/**
 * 先発XI（Wikipedia取得）の被覆監査（T-92）。
 *
 * 先発XIは DB に保存されず、試合詳細ページ描画時に Wikipedia からライブ取得して表示する
 * （取れなければ非表示）。そのため「取れていない」事象は DB だけ見る `auditMatches` では検知できない。
 * 本モジュールは終了グループ戦について実際に取得を試み、欠落/部分/失敗を所見化する。
 * 記事はグループ単位の単一URL（最大12）。**グループ単位で1回だけ並列取得**し、その同一HTMLを
 * 同グループの全試合で使い回す。これにより health エンドポイント（/api/health/ingest・/admin/health）が
 * 外部取得の直列累積に巻き込まれて遅延・タイムアウトするのを防ぐ（壁時計は概ね1取得ぶん）。
 */

export type LineupAuditMatch = {
  id: number;
  groupLetter: string | null;
  home: LineupTeamRef | null;
  away: LineupTeamRef | null;
};

/** チーム/グループ確定済みの監査対象（取得対象だけに絞った狭い型）。 */
type LineupAuditTarget = LineupAuditMatch & {
  groupLetter: string;
  home: LineupTeamRef;
  away: LineupTeamRef;
};

/** グループ記事の取得結果（本文 or 取得失敗）。 */
type GroupFetch = { html: string | null } | { error: string };

export async function auditLineups(
  matches: LineupAuditMatch[],
  options: WikipediaLineupOptions = {},
): Promise<AuditFinding[]> {
  // チーム未確定/グループ不明はラインアップ取得対象外（誤検知しない＝fetchもしない）。
  const targets = matches.filter(
    (m): m is LineupAuditTarget => Boolean(m.groupLetter && m.home?.nameEn && m.away?.nameEn),
  );

  // グループ単位で重複排除し、各記事を1回だけ並列取得（distinct URL ≤12）。
  const groups = [...new Set(targets.map((m) => m.groupLetter))];
  const htmlByGroup = new Map<string, GroupFetch>();
  await Promise.all(
    groups.map(async (g) => {
      try {
        htmlByGroup.set(g, { html: await fetchGroupArticleHtml(g, options) });
      } catch (error) {
        htmlByGroup.set(g, { error: error instanceof Error ? error.message : 'fetch failed' });
      }
    }),
  );

  const findings: AuditFinding[] = [];

  for (const m of targets) {
    const fetched = htmlByGroup.get(m.groupLetter)!;
    const coverage: LineupCoverage =
      'error' in fetched
        ? { status: 'fetch_failed', error: fetched.error }
        : fetched.html
          ? lineupCoverageFromHtml(fetched.html, m.home, m.away)
          : { status: 'fetch_failed', error: 'wikipedia returned no parseable html' };

    if (coverage.status === 'ok') continue;

    if (coverage.status === 'fetch_failed') {
      findings.push({
        matchId: m.id,
        kind: 'lineup_fetch_failed',
        severity: 'warn',
        message: `先発XIの取得に失敗（Wikipedia fetch/parse）：${coverage.error}`,
        context: { group: m.groupLetter, error: coverage.error },
      });
    } else if (coverage.status === 'partial') {
      findings.push({
        matchId: m.id,
        kind: 'lineup_partial',
        severity: 'warn',
        message: `先発XIが部分取得：home ${coverage.homeCount}人 / away ${coverage.awayCount}人（11人未満）。`,
        context: {
          group: m.groupLetter,
          homeCount: coverage.homeCount,
          awayCount: coverage.awayCount,
        },
      });
    } else {
      findings.push({
        matchId: m.id,
        kind: 'lineup_missing',
        severity: 'warn',
        message: '終了済みグループ戦の先発XIが取得できません（Wikipedia未掲載/解析失敗）。',
        context: { group: m.groupLetter, reason: coverage.reason },
      });
    }
  }

  return findings;
}
