import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { notifyDiscordHealth } from '@/lib/ingest/health-notification';
import { runIngestion } from '@/lib/ingest/run';
import { runDataAudit } from '@/lib/ingest/run-audit';
import { createTheSportsDbProvider } from '@/lib/ingest/thesportsdb';
import {
  createWikipediaMatchEventProvider,
  withWikipediaEvents,
  withWikipediaPrimaryResults,
} from '@/lib/ingest/wikipedia';

type IngestMode = 'full' | 'hot';

type HandleIngestOptions = {
  mode: IngestMode;
  dates?: string[];
};

/**
 * Vercel Cron は CRON_SECRET 設定時に `Authorization: Bearer <CRON_SECRET>` を
 * 自動付与する。未設定や不一致は 401（安全側で拒否）。
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function revalidateIngestedPaths(summary: Awaited<ReturnType<typeof runIngestion>>): void {
  const touchedMatchIds = new Set<number>(summary.matchIds);
  for (const { matchId, count } of summary.events.perMatch) {
    if (count > 0) touchedMatchIds.add(matchId);
  }

  if (summary.updated > 0 || summary.events.synced > 0) {
    revalidatePath('/');
    revalidatePath('/groups');
    revalidatePath('/prediction');
    revalidatePath('/rankings');
    revalidatePath('/admin');
    revalidatePath('/admin/health');
  }

  for (const matchId of touchedMatchIds) {
    revalidatePath(`/matches/${matchId}`);
    revalidatePath(`/admin/matches/${matchId}`);
  }
}

/**
 * 取込 provider を組み立てる。`INGEST_RESULTS_SOURCE` で結果の主ソースを切替える:
 *  - 'wikipedia' … グループ結果を Wikipedia 主に（TheSportsDB は決勝T含む補助＋相互チェック）。
 *  - 未設定/その他 … 従来どおり TheSportsDB 主・Wikipedia は補完（既定・revert 経路）。
 * `dates` 指定時は TheSportsDB 側の取得日だけを絞り、ホット取込で過剰フェッチを避ける。
 */
function createIngestProvider(dates?: string[]) {
  const tsdb = createTheSportsDbProvider(dates ? { dates } : undefined);
  const wiki = createWikipediaMatchEventProvider();
  return process.env.INGEST_RESULTS_SOURCE === 'wikipedia'
    ? withWikipediaPrimaryResults(tsdb, wiki)
    : withWikipediaEvents(tsdb, wiki);
}

export async function handleIngestRequest(request: Request, options: HandleIngestOptions) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runIngestion(createIngestProvider(options.dates));
    revalidateIngestedPaths(summary);

    // 部分失敗は 200 で返しつつ（成功分は確定済み）、監視用に Function ログへ残す。
    // ネットワーク失敗（fetch 自体）は runIngestion が throw し、下の catch で 500。
    if (summary.failures.length > 0) {
      console.error('[ingest] partial failures', { mode: options.mode, failures: summary.failures });
    }
    if (summary.events.failures.length > 0) {
      console.error('[ingest] event sync failures', {
        mode: options.mode,
        failures: summary.events.failures,
      });
    }

    // 取込直後にデータの自動セルフ監査を回し、未取込疑い/整合エラーを cron ログに残す（T-82）。
    // 監査の失敗は取込成功を覆さない（独立した監視レイヤ）。
    let audit;
    try {
      audit = await runDataAudit();
      if (audit.findings.length > 0) {
        console.warn('[ingest] data audit findings', {
          mode: options.mode,
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
          console.info('[ingest] data audit Discord notification', {
            mode: options.mode,
            status: notification,
          });
        }
      } catch (notificationError) {
        console.error('[ingest] data audit Discord notification failed', notificationError);
      }
    } catch (auditError) {
      console.error('[ingest] data audit failed', auditError);
    }

    return NextResponse.json({
      ok: true,
      mode: options.mode,
      dates: options.dates ?? null,
      ...summary,
      audit: audit?.counts ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ingest failed';
    return NextResponse.json({ ok: false, mode: options.mode, message }, { status: 500 });
  }
}
