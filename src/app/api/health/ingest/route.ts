import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth';
import { runDataAudit } from '@/lib/ingest/run-audit';

export const dynamic = 'force-dynamic';

/**
 * 取込データの機械可読ヘルスエンドポイント（T-82）。
 *
 * 認可: 監視ツール向けに `Authorization: Bearer <CRON_SECRET>`、または管理者セッション（isAdmin）。
 * 試合データの健全性（未取込疑い・得点者の過不足）を外部に晒さないため未認可は 401。
 *
 * レスポンス: `{ ok, generatedAt, checkedMatches, findings, counts }`。
 * `ok=true` は所見ゼロ（健全）。所見があっても監査自体は成功なので HTTP は 200。
 */
function hasCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  const authorized = hasCronSecret(request) || (await isAdmin());
  if (!authorized) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  try {
    const report = await runDataAudit();
    return NextResponse.json({ ok: report.findings.length === 0, ...report });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'audit failed';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
