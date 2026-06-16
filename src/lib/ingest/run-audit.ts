import {
  getAuditGoalEvents,
  getAuditMatches,
  getAuditSubstitutionMatchIds,
  getLineupAuditMatches,
} from '@/db/audit';

import { auditMatches, type AuditConfig, type AuditReport } from './audit';
import { auditLineups } from './lineup-audit';

/**
 * DB から試合・得点イベント・交代有無を取得し、純関数 `auditMatches` で監査レポートを生成する。
 * さらに先発XI（Wikipediaライブ取得）の被覆監査（T-92）をマージする。
 * health エンドポイント / admin データヘルス画面 / cron ログの共通入口。
 */
export async function runDataAudit(config: AuditConfig = {}): Promise<AuditReport> {
  const [matches, goalEvents, substitutionMatchIds, lineupMatches] = await Promise.all([
    getAuditMatches(),
    getAuditGoalEvents(),
    getAuditSubstitutionMatchIds(),
    getLineupAuditMatches(),
  ]);

  const base = auditMatches(matches, goalEvents, config, substitutionMatchIds);

  // 先発XIは DB に無くライブ取得が要るため、純関数の外でマージする（counts.lineupIssues に集計）。
  const lineupFindings = await auditLineups(lineupMatches);

  return {
    ...base,
    findings: [...base.findings, ...lineupFindings],
    counts: { ...base.counts, lineupIssues: lineupFindings.length },
  };
}
