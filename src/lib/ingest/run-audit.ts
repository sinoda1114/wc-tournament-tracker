import { getAuditGoalEvents, getAuditMatches } from '@/db/audit';

import { auditMatches, type AuditConfig, type AuditReport } from './audit';

/**
 * DB から試合・得点イベントを取得し、純関数 `auditMatches` で監査レポートを生成する。
 * health エンドポイント / admin データヘルス画面 / cron ログの共通入口。
 */
export async function runDataAudit(config: AuditConfig = {}): Promise<AuditReport> {
  const [matches, goalEvents] = await Promise.all([getAuditMatches(), getAuditGoalEvents()]);
  return auditMatches(matches, goalEvents, config);
}
