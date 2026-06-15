import Stripe from 'stripe';

import type { Market, PriceTier } from '@/lib/pricing';
import { marketForLocale, priceTier } from '@/lib/pricing';
import type { Locale } from '@/lib/i18n/config';

/**
 * Stripe クライアントと Checkout（買い切り）の薄いサーバ専用ラッパ（T-14）。
 *
 * - シークレット（STRIPE_SECRET_KEY）は env からのみ。クライアントへ露出しない。
 * - 価格（Price ID）はサーバが market×tier で決定する。クライアントから金額/価格は受けない。
 * - Stripe Price ID は env で渡す（実値はダッシュボードで番人/ユーザーが設定）。
 */

/** 市場×段階 → env 名の対応（実 Price ID はダッシュボードで作成して env に入れる）。 */
const PRICE_ENV: Record<Market, Record<PriceTier, string>> = {
  jp: {
    early: 'STRIPE_PRICE_JP_EARLY',
    regular: 'STRIPE_PRICE_JP_REGULAR',
  },
  intl: {
    early: 'STRIPE_PRICE_INTL_EARLY',
    regular: 'STRIPE_PRICE_INTL_REGULAR',
  },
};

let cached: Stripe | null = null;

/** Stripe クライアント（遅延初期化）。STRIPE_SECRET_KEY 未設定なら例外。 */
export function getStripe(): Stripe {
  if (cached) return cached;
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY が設定されていません（Stripe 課金が無効です）。');
  }
  // apiVersion は SDK 同梱の既定を使う（明示固定は SDK 更新時の不整合を避けるため省略）。
  cached = new Stripe(secret);
  return cached;
}

/** ロケール×現在時刻に対応する Stripe Price ID を env から解決する（サーバ決定）。 */
export function resolvePriceId(locale: Locale, now: Date): string {
  const market = marketForLocale(locale);
  const tier = priceTier(now);
  const envName = PRICE_ENV[market][tier];
  const priceId = process.env[envName]?.trim();
  if (!priceId) {
    throw new Error(`Stripe Price ID が未設定です: ${envName}`);
  }
  return priceId;
}

/** Webhook の署名検証用シークレット。 */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET が設定されていません（webhook 署名検証が不可）。');
  }
  return secret;
}

type CreateCheckoutInput = {
  userId: string;
  locale: Locale;
  now: Date;
  /** 決済完了後の戻り先（絶対 URL）。 */
  successUrl: string;
  /** キャンセル時の戻り先（絶対 URL）。 */
  cancelUrl: string;
  /** Clerk のメール（Stripe 顧客の事前入力・任意）。 */
  email?: string | null;
};

/**
 * 買い切り（mode: 'payment'）の Checkout セッションを作成し、リダイレクト先 URL を返す。
 * client_reference_id と metadata に Clerk userId を載せ、webhook で本人へ紐付ける。
 */
export async function createCheckoutSession(input: CreateCheckoutInput): Promise<string> {
  const { userId, locale, now, successUrl, cancelUrl, email } = input;
  const priceId = resolvePriceId(locale, now);

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: { userId },
    // 顧客メールがあれば事前入力（無くても Checkout 側で入力可）。
    ...(email ? { customer_email: email } : {}),
  });

  if (!session.url) {
    throw new Error('Stripe Checkout セッションの URL を取得できませんでした。');
  }
  return session.url;
}
