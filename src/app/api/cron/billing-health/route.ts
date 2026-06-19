import { NextResponse } from 'next/server';

import { reconcileEntitlements } from '@/lib/billing/reconcile';
import { buildBillingAlertMessage } from '@/lib/billing/reconcile-core';
import { postDiscordMessage } from '@/lib/ingest/health-notification';

export const dynamic = 'force-dynamic';
// Stripe events.list（外部 API）を含むため上限を引き上げる。
export const maxDuration = 60;

/**
 * 課金突合の独立監視 cron（#159 / #156 再発防止）。
 *
 * Stripe の「支払い済み checkout.session」と自社 entitlements を突合し、
 * 「払ったのに未付与」を検知 → 自動付与（応急処置）→ Discord 通知する。
 * webhook 経路に依存しないので、署名不一致・エンドポイント無効などで配信が静かに
 * 失われていても、人手の偶然に頼らず検知できる。
 *
 * 認可: Vercel Cron が付与する `Authorization: Bearer <CRON_SECRET>` のみ
 *   （DB 書き込み＝entitlement 付与の副作用を持つため、人手のページ閲覧では発火させない）。
 * 通知: 既存のデータヘルスと同じ `DISCORD_HEALTH_WEBHOOK_URL` に相乗り。自動付与により
 *   同じ購入が翌回も検知され続けることはない（再付与は冪等・既付与は missing に出ない）ため、
 *   実質「新たな未付与が出たときだけ」通知される（dedup 不要）。
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
    const result = await reconcileEntitlements({ heal: true });

    if (result.missing.length > 0) {
      const webhookUrl = process.env.DISCORD_HEALTH_WEBHOOK_URL?.trim();
      if (webhookUrl) {
        // 未付与が残っている（自動付与に失敗した）場合は @everyone で強めに通知。
        const unhealed = result.missing.length - result.healed.length;
        await postDiscordMessage(webhookUrl, buildBillingAlertMessage(result), {
          mentionEveryone: unhealed > 0,
        }).catch(() => undefined);
      }
    }

    return NextResponse.json({
      ok: true,
      checkedUsers: result.checkedUsers,
      missing: result.missing.length,
      healed: result.healed.length,
    });
  } catch (error) {
    console.error('[cron/billing-health] reconcile failed', error);
    return NextResponse.json({ ok: false, message: 'reconcile failed' }, { status: 500 });
  }
}
