import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { runIngestion } from '@/lib/ingest/run';
import { createTheSportsDbProvider } from '@/lib/ingest/thesportsdb';

export const dynamic = 'force-dynamic';

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
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ingest failed';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
