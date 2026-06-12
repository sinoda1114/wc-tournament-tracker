import { NextResponse } from 'next/server';

import { auth, currentUser } from '@clerk/nextjs/server';

import { getSiteUrl } from '@/lib/env';
import { createCheckoutSession } from '@/lib/billing/stripe';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

/**
 * 買い切り Checkout セッションを作成し、Stripe の決済ページ URL を返す（T-14）。
 *
 * - 要ログイン（未ログインは 401。導線側で sign-in へ誘導する）。
 * - 価格はサーバが現在時刻×ロケールで決定（クライアントから金額/価格 ID は受けない）。
 * - 受け取るのは locale ヒント（任意・市場判定のみ。金額には影響させず env Price ID 経由）。
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  // locale はクライアントのヒント（市場＝jp/intl の選択のみ）。不正値は既定へフォールバック。
  let locale = DEFAULT_LOCALE;
  try {
    const body = (await request.json()) as { locale?: unknown };
    if (typeof body.locale === 'string' && isLocale(body.locale)) {
      locale = body.locale;
    }
  } catch {
    // body 無し/不正でも既定ロケールで続行。
  }

  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? null;
    const siteUrl = getSiteUrl();

    const url = await createCheckoutSession({
      userId,
      locale,
      now: new Date(),
      successUrl: `${siteUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/billing/cancel`,
      email,
    });

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    // 価格 ID 未設定や Stripe 障害は 500（詳細はサーバログのみ・クライアントへ漏らさない）。
    console.error('[stripe/checkout] failed', error);
    return NextResponse.json(
      { ok: false, message: 'checkout_unavailable' },
      { status: 500 },
    );
  }
}
