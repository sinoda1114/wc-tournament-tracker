import {
  getHealthNotificationState,
  markHealthNotificationAlert,
  markHealthNotificationRecovered,
  type HealthNotificationState,
} from '@/db/health-notifications';
import { getSiteUrl } from '@/lib/env';

import type { AuditFinding, AuditReport } from './audit';

const DISCORD_CHANNEL = 'discord-health';
const MAX_FINDINGS_IN_MESSAGE = 3;
const DISCORD_CONTENT_LIMIT = 2000;

type NotificationStatus = 'alert' | 'recovered' | 'unchanged';

type HealthNotificationDecision =
  | { status: 'alert'; signature: string }
  | { status: 'recovered' }
  | { status: 'unchanged' };

type StateStore = {
  get(): Promise<HealthNotificationState | null>;
  markAlert(signature: string): Promise<void>;
  markRecovered(): Promise<void>;
};

function findingKey(finding: AuditFinding): string {
  return `${finding.matchId}:${finding.kind}:${finding.severity}`;
}

export function auditSignature(report: AuditReport): string {
  return report.findings.map(findingKey).sort().join('|');
}

export function decideHealthNotification(
  report: AuditReport,
  state: HealthNotificationState | null,
): HealthNotificationDecision {
  if (report.findings.length === 0) {
    return state?.lastStatus === 'alert' ? { status: 'recovered' } : { status: 'unchanged' };
  }

  const signature = auditSignature(report);
  if (state?.lastStatus === 'alert' && state.activeSignature === signature) {
    return { status: 'unchanged' };
  }

  return { status: 'alert', signature };
}

function summarizeFinding(finding: AuditFinding): string {
  const message =
    finding.message.length > 180 ? `${finding.message.slice(0, 177)}...` : finding.message;
  return `#${finding.matchId} ${finding.kind}: ${message}`;
}

export function buildDiscordHealthMessage(
  report: AuditReport,
  status: Exclude<NotificationStatus, 'unchanged'>,
): string {
  const adminUrl = `${getSiteUrl()}/admin/health`;
  if (status === 'recovered') {
    return [
      '✅ MatchFav データヘルス復旧',
      '',
      '現在の監査所見は0件です。',
      '',
      `確認: ${adminUrl}`,
      `時刻: ${report.generatedAt}`,
    ].join('\n');
  }

  const counts = report.counts;
  const lines = [
    '🔴 MatchFav データヘルス異常',
    '',
    `未取込疑い: ${counts.staleUnfinished}`,
    `整合エラー: ${counts.scoreMismatch}`,
    `交代0件: ${counts.finishedNoSubs}`,
    `先発XI: ${counts.lineupIssues}`,
  ];

  const examples = report.findings.slice(0, MAX_FINDINGS_IN_MESSAGE);
  if (examples.length > 0) {
    lines.push('', '代表所見:');
    lines.push(...examples.map((finding) => `- ${summarizeFinding(finding)}`));
  }

  lines.push('', `確認: ${adminUrl}`, `時刻: ${report.generatedAt}`);
  const message = lines.join('\n');
  return message.length > DISCORD_CONTENT_LIMIT
    ? `${message.slice(0, DISCORD_CONTENT_LIMIT - 20)}\n...(省略)`
    : message;
}

async function postDiscordMessage(webhookUrl: string, content: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'MatchFav Health',
      content,
      allowed_mentions: { parse: [] },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Discord webhook failed: ${res.status} ${body}`.trim());
  }
}

export async function notifyDiscordHealth(
  report: AuditReport,
  options: {
    webhookUrl?: string;
    store?: StateStore;
  } = {},
): Promise<NotificationStatus> {
  const webhookUrl = options.webhookUrl ?? process.env.DISCORD_HEALTH_WEBHOOK_URL?.trim();
  if (!webhookUrl) return 'unchanged';

  const store = options.store ?? {
    get: () => getHealthNotificationState(DISCORD_CHANNEL),
    markAlert: (signature: string) => markHealthNotificationAlert(DISCORD_CHANNEL, signature),
    markRecovered: () => markHealthNotificationRecovered(DISCORD_CHANNEL),
  };

  const state = await store.get();
  const decision = decideHealthNotification(report, state);
  if (decision.status === 'unchanged') return 'unchanged';

  await postDiscordMessage(webhookUrl, buildDiscordHealthMessage(report, decision.status));

  if (decision.status === 'alert') {
    await store.markAlert(decision.signature);
    return 'alert';
  }

  await store.markRecovered();
  return 'recovered';
}
