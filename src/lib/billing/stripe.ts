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

const CHECKOUT_PRODUCT = 'matchfav';
const CHECKOUT_STATEMENT_DESCRIPTOR_SUFFIX = 'MATCHFAV';
const STRIPE_CHECKOUT_LOCALE: Record<Locale, Stripe.Checkout.SessionCreateParams.Locale> = {
  ja: 'ja',
  en: 'en',
  es: 'es',
  pt: 'pt',
  zh: 'zh',
};
const CHECKOUT_PRODUCT_COPY: Record<Locale, { name: string; description: string }> = {
  ja: {
    name: 'MatchFav フルアクセス（買い切り）',
    description: 'MatchFav の決勝トーナメント投票など全機能を解放する買い切りパス',
  },
  en: {
    name: 'MatchFav Full Access (one-time purchase)',
    description:
      'Unlock knockout predictions, brackets, and all paid MatchFav features with one pass.',
  },
  es: {
    name: 'MatchFav Acceso completo (pago único)',
    description:
      'Desbloquea los pronósticos, el cuadro eliminatorio y todas las funciones de pago de MatchFav.',
  },
  pt: {
    name: 'MatchFav Acesso completo (compra única)',
    description:
      'Libere os palpites, o chaveamento do mata-mata e todos os recursos pagos do MatchFav.',
  },
  zh: {
    name: 'MatchFav 全功能通行证（一次性买断）',
    description: '解锁淘汰赛预测、对阵表以及 MatchFav 的所有付费功能。',
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

type CheckoutStripeClient = {
  checkout: {
    sessions: {
      create: (params: Stripe.Checkout.SessionCreateParams) => Promise<{ url: string | null }>;
    };
  };
  customers: {
    list: (params: Stripe.CustomerListParams) => Promise<{ data: CheckoutCustomer[] }>;
    create: (params: Stripe.CustomerCreateParams) => Promise<{ id: string }>;
    update: (id: string, params: Stripe.CustomerUpdateParams) => Promise<{ id: string }>;
  };
  prices: {
    retrieve: (id: string) => Promise<CheckoutPrice>;
  };
};

type CheckoutCustomer = {
  id: string;
  metadata?: Stripe.Metadata | null;
};

type CheckoutPrice = {
  currency: string;
  unit_amount: number | null;
};

type CheckoutCustomerParams = Pick<Stripe.Checkout.SessionCreateParams, 'customer' | 'customer_email'>;
type CheckoutLineItem = NonNullable<Stripe.Checkout.SessionCreateParams['line_items']>[number];

export function stripeLocaleForCheckout(locale: Locale): Stripe.Checkout.SessionCreateParams.Locale {
  return STRIPE_CHECKOUT_LOCALE[locale];
}

export function checkoutProductCopy(locale: Locale): { name: string; description: string } {
  return CHECKOUT_PRODUCT_COPY[locale];
}

export function buildCheckoutSessionParams(
  input: CreateCheckoutInput,
  lineItem: CheckoutLineItem,
  customerParams: CheckoutCustomerParams,
): Stripe.Checkout.SessionCreateParams {
  const { userId, locale, successUrl, cancelUrl } = input;
  return {
    mode: 'payment',
    line_items: [lineItem],
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale: stripeLocaleForCheckout(locale),
    client_reference_id: userId,
    metadata: { userId, product: CHECKOUT_PRODUCT },
    payment_intent_data: {
      metadata: { userId, product: CHECKOUT_PRODUCT },
      // カード明細はアカウントの短縮表記（例: WAALSFORCE）+ suffix で表示される。
      statement_descriptor_suffix: CHECKOUT_STATEMENT_DESCRIPTOR_SUFFIX,
    },
    ...customerParams,
  };
}

async function resolveCheckoutLineItem(
  stripe: CheckoutStripeClient,
  input: CreateCheckoutInput,
): Promise<CheckoutLineItem> {
  const priceId = resolvePriceId(input.locale, input.now);
  const price = await stripe.prices.retrieve(priceId);
  if (price.unit_amount == null) {
    throw new Error(`Stripe Price の unit_amount を取得できませんでした: ${priceId}`);
  }

  return {
    quantity: 1,
    price_data: {
      currency: price.currency,
      unit_amount: price.unit_amount,
      product_data: checkoutProductCopy(input.locale),
    },
  };
}

async function resolveCheckoutCustomerParams(
  stripe: CheckoutStripeClient,
  input: CreateCheckoutInput,
): Promise<CheckoutCustomerParams> {
  const email = input.email?.trim();
  if (!email) return {};

  const preferredLocales = [stripeLocaleForCheckout(input.locale)];
  const existing = await stripe.customers.list({ email, limit: 10 });
  const customer = existing.data.find((c) => c.metadata?.userId === input.userId);
  if (customer) {
    await stripe.customers.update(customer.id, { preferred_locales: preferredLocales });
    return { customer: customer.id };
  }

  const created = await stripe.customers.create({
    email,
    preferred_locales: preferredLocales,
    metadata: { userId: input.userId, product: CHECKOUT_PRODUCT },
  });
  return { customer: created.id };
}

/**
 * 買い切り（mode: 'payment'）の Checkout セッションを作成し、リダイレクト先 URL を返す。
 * client_reference_id と metadata に Clerk userId を載せ、webhook で本人へ紐付ける。
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput,
  client: CheckoutStripeClient = getStripe(),
): Promise<string> {
  const lineItem = await resolveCheckoutLineItem(client, input);
  const customerParams = await resolveCheckoutCustomerParams(client, input);

  const session = await client.checkout.sessions.create(
    buildCheckoutSessionParams(input, lineItem, customerParams),
  );

  if (!session.url) {
    throw new Error('Stripe Checkout セッションの URL を取得できませんでした。');
  }
  return session.url;
}

/**
 * 価格設定の自動検証（運用ガード）。
 *
 * 背景: 2026-06-16 に STRIPE_SECRET_KEY へ別アカウントの鍵が入っていて checkout が 500 になった。
 * 早割は実機で気づけたが、通常価格は切り替わる 6/29 まで一度も使われず、誤りに気づけない穴があった。
 * → market×tier の全 Price ID を Stripe に問い合わせ、鍵と価格 ID の整合を「使われる前に」検出する。
 */
export type PriceCheckResult = {
  envName: string;
  market: Market;
  tier: PriceTier;
  /** env に Price ID が設定されているか。 */
  configured: boolean;
  /** Stripe 上で実在し有効（active）か。 */
  valid: boolean;
  /** 失敗理由（No such price / 鍵不正 / 未設定 等）。正常時は null。 */
  error: string | null;
};

export type StripeConfigReport = {
  /** 秘密鍵があり、かつ全 Price が有効なら true。 */
  ok: boolean;
  /** STRIPE_SECRET_KEY が読み込めたか。 */
  secretConfigured: boolean;
  checks: PriceCheckResult[];
  checkedAt: string;
};

/** verifyStripeConfig が必要とする最小インターフェース（テストで差し替え可能にする）。 */
type PriceRetriever = {
  prices: { retrieve: (id: string) => Promise<{ active?: boolean | null }> };
};

const ALL_MARKET_TIERS: ReadonlyArray<{ market: Market; tier: PriceTier }> = [
  { market: 'jp', tier: 'early' },
  { market: 'jp', tier: 'regular' },
  { market: 'intl', tier: 'early' },
  { market: 'intl', tier: 'regular' },
];

/** 実 Stripe クライアントを最小インターフェースに包む。鍵未設定なら null。 */
function buildRetriever(): PriceRetriever | null {
  try {
    const stripe = getStripe();
    return { prices: { retrieve: (id: string) => stripe.prices.retrieve(id) } };
  } catch {
    return null;
  }
}

/**
 * 設定済みの全 Price ID を Stripe に問い合わせ、設定の正しさを検証する。
 * `client` を渡すとそれを使う（テスト用）。省略時は env の秘密鍵から実クライアントを作る。
 */
export async function verifyStripeConfig(
  client?: PriceRetriever,
  now: Date = new Date(),
): Promise<StripeConfigReport> {
  let retriever: PriceRetriever | null = client ?? null;
  let secretConfigured = true;
  if (!retriever) {
    retriever = buildRetriever();
    if (!retriever) secretConfigured = false;
  }

  const checks: PriceCheckResult[] = [];
  for (const { market, tier } of ALL_MARKET_TIERS) {
    const envName = PRICE_ENV[market][tier];
    const priceId = process.env[envName]?.trim();

    if (!priceId) {
      checks.push({ envName, market, tier, configured: false, valid: false, error: 'Price ID が未設定です' });
      continue;
    }
    if (!retriever) {
      checks.push({
        envName,
        market,
        tier,
        configured: true,
        valid: false,
        error: 'STRIPE_SECRET_KEY が未設定/無効のため確認できません',
      });
      continue;
    }

    try {
      const price = await retriever.prices.retrieve(priceId);
      const active = price.active !== false;
      checks.push({
        envName,
        market,
        tier,
        configured: true,
        valid: active,
        error: active ? null : '価格が無効化されています（active=false）',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Stripe への問い合わせに失敗しました';
      checks.push({ envName, market, tier, configured: true, valid: false, error: message });
    }
  }

  const ok = secretConfigured && checks.every((check) => check.valid);
  return { ok, secretConfigured, checks, checkedAt: now.toISOString() };
}
