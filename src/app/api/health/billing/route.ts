import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth';
import { verifyStripeConfig } from '@/lib/billing/stripe';

export const dynamic = 'force-dynamic';

/**
 * Stripe 価格設定の機械可読ヘルスエンドポイント（対策A / 2026-06-16 の checkout 500 再発防止）。
 *
 * 認可: 監視ツール向けに `Authorization: Bearer <CRON_SECRET>`、または管理者セッション（isAdmin）。
 * 秘密鍵・価格 ID の整合を外部に晒さないため未認可は 401。
 *
 * レスポンス: `{ ok, secretConfigured, checks, checkedAt }`。
 * `ok=true` は秘密鍵あり かつ 全 Price ID（早割/通常 × 日本/海外）が Stripe 上で有効。
 * 設定不備があっても検証自体は成功なので HTTP は 200（ok=false で内容を返す）。
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
    const report = await verifyStripeConfig();
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'stripe config check failed';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
