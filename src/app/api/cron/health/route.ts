import { NextResponse } from 'next/server';

import { notifyDiscordHealth } from '@/lib/ingest/health-notification';
import { runDataAudit } from '@/lib/ingest/run-audit';

export const dynamic = 'force-dynamic';
// 監査は先発XIの Wikipedia ライブ取得（レート制限ペーシング）を含むため、上限を引き上げる。
export const maxDuration = 60;

/**
 * データヘルスの独立監視 cron（T-111）。
 *
 * 背景: これまで Discord 通知は `/api/ingest` 成功後にしか走らなかった。
 * 取込（runIngestion）が throw / タイムアウトすると監査・通知ごとスキップされ、
 * 「ヘルス画面(/admin/health)は異常を表示しているのに Discord は沈黙」になっていた
 * （第19試合型の未取込疑い）。本ルートは取込と独立して監査＋通知だけを回す安全網。
 *
 * 認可: Vercel Cron が付与する `Authorization: Bearer <CRON_SECRET>` のみ。
 *   通知という副作用を持つため、管理者セッション（人手のページ閲覧相当）では発火させない。
 *
 * 通知は `/api/ingest` と同じ `discord-health` チャネル＋`health_notification_state` を共有するため、
 * dedup（同一異常の連投防止）・復旧通知・`@everyone`（異常時のみ）は既存仕様とそのまま整合する。
 */
function hasCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  try {
    const report = await runDataAudit();
    // 監査結果（＝ヘルス画面に出る異常）をそのまま Discord へ橋渡しする。
    // 通知失敗は監査成功を覆さない（独立した監視レイヤ）。
    let notification: 'alert' | 'recovered' | 'unchanged' = 'unchanged';
    try {
      notification = await notifyDiscordHealth(report);
      if (notification !== 'unchanged') {
        console.info('[cron/health] Discord notification', { status: notification });
      }
    } catch (notificationError) {
      console.error('[cron/health] Discord notification failed', notificationError);
    }

    return NextResponse.json({
      ok: report.findings.length === 0,
      notification,
      generatedAt: report.generatedAt,
      checkedMatches: report.checkedMatches,
      counts: report.counts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'health audit failed';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
