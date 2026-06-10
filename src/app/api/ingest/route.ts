import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { runIngestion } from '@/lib/ingest/run';
import { createTheSportsDbProvider } from '@/lib/ingest/thesportsdb';

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
    const summary = await runIngestion(createTheSportsDbProvider());
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
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ingest failed';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
