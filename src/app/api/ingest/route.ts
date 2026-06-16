import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { runDataAudit } from '@/lib/ingest/run-audit';
import { notifyDiscordHealth } from '@/lib/ingest/health-notification';
import { runIngestion } from '@/lib/ingest/run';
import { createTheSportsDbProvider } from '@/lib/ingest/thesportsdb';
import { createWikipediaMatchEventProvider, withWikipediaEvents } from '@/lib/ingest/wikipedia';

export const dynamic = 'force-dynamic';
// タイムライン取得は試合ごとに 1 リクエスト＋レート制限ペーシングがあるため、
// 既定タイムアウトでは不足し得る。上限を引き上げる（Vercel Hobby でも 60s まで可）。
export const maxDuration = 60;

/**
 * Vercel Cron は CRON_SECRET 設定時に `Authorization: Bearer <CRON_SECRET>` を
 * 自動付与する。未設定や不一致は 401（安全側で拒否）。
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  try {
    // 結果/スコア/日程は TheSportsDB が正。イベント（得点・カード・交代）は Wikipedia を
    // 優先し、空/失敗なら TheSportsDB タイムラインへフォールバックする（無料キーの切り詰め対策）。
    const provider = withWikipediaEvents(
      createTheSportsDbProvider(),
      createWikipediaMatchEventProvider(),
    );
    const summary = await runIngestion(provider);
    if (summary.updated > 0) {
      revalidatePath('/prediction');
      revalidatePath('/');
    }
    // 部分失敗は 200 で返しつつ（成功分は確定済み）、監視用に Function ログへ残す。
    // ネットワーク失敗（fetch 自体）は runIngestion が throw し、下の catch で 500。
    if (summary.failures.length > 0) {
      console.error('[ingest] partial failures', summary.failures);
    }
    if (summary.events.failures.length > 0) {
      console.error('[ingest] event sync failures', summary.events.failures);
    }
    // イベントを取り込んだ試合（0件スキップは除く）の詳細ページを再生成する。
    for (const { matchId, count } of summary.events.perMatch) {
      if (count > 0) revalidatePath(`/matches/${matchId}`);
    }

    // 取込直後にデータの自動セルフ監査を回し、未取込疑い/整合エラーを cron ログに残す（T-82）。
    // 監査の失敗は取込成功を覆さない（独立した監視レイヤ）。
    let audit;
    try {
      audit = await runDataAudit();
      if (audit.findings.length > 0) {
        console.warn('[ingest] data audit findings', {
          staleUnfinished: audit.counts.staleUnfinished,
          scoreMismatch: audit.counts.scoreMismatch,
          finishedNoSubs: audit.counts.finishedNoSubs,
          lineupIssues: audit.counts.lineupIssues,
          findings: audit.findings,
        });
      }
      try {
        const notification = await notifyDiscordHealth(audit);
        if (notification !== 'unchanged') {
          console.info('[ingest] data audit Discord notification', { status: notification });
        }
      } catch (notificationError) {
        console.error('[ingest] data audit Discord notification failed', notificationError);
      }
    } catch (auditError) {
      console.error('[ingest] data audit failed', auditError);
    }

    return NextResponse.json({ ok: true, ...summary, audit: audit?.counts ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ingest failed';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
