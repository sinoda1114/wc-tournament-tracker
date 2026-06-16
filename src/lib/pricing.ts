import type { Locale } from '@/lib/i18n/config';

/**
 * 価格・無料期間の単一情報源（#26 予告バナー / #14 課金で共用）。
 *
 * 課金動線（2026-06-11 確定・launch-monetization-plan / T-14 早割確定）:
 *  - グループステージ（最終戦は JST 6/28 11:00 KO・13:00頃終了）は全登録者無料。
 *  - 決勝トーナメント（初戦 R32 = JST 6/29 04:00 KO）から買い切り課金。
 *  - 提供期間は買い切りで 〜2026-09-30。
 *  - 価格は市場ごとに非パリティ＋早割2段（境界は {@link KNOCKOUT_START_UTC} を流用）:
 *      日本   早割 ¥680（境界前）→ 通常 ¥980（境界以降）
 *      海外   早割 $5  （境界前）→ 通常 $7  （境界以降）
 *
 * 重要: 金額・段階の決定はサーバ側のこの定数のみが正本。クライアントから金額は受けない。
 * Stripe 側の実 Price ID は env（{@link priceTier} の market×tier）に対応させてダッシュボードで設定する。
 */

/** 課金市場（日本 / 海外）。日本語ロケールのみ `jp`、それ以外は `intl`。 */
export type Market = 'jp' | 'intl';

/** 価格段階（早割 / 通常）。境界は {@link KNOCKOUT_START_UTC}。 */
export type PriceTier = 'early' | 'regular';

type PriceInfo = { amount: number; display: string; currency: 'jpy' | 'usd' };

/**
 * 市場×段階の価格表（買い切り・早割2段）。表示・Stripe Price ID 選択の単一情報源。
 * `amount` は最小通貨単位ではなく「表示金額」（JPY は円・USD はドル）。
 */
export const PRICE_TABLE: Record<Market, Record<PriceTier, PriceInfo>> = {
  jp: {
    early: { amount: 680, display: '¥680', currency: 'jpy' },
    regular: { amount: 980, display: '¥980', currency: 'jpy' },
  },
  intl: {
    early: { amount: 5, display: '$5', currency: 'usd' },
    regular: { amount: 7, display: '$7', currency: 'usd' },
  },
};

/** 後方互換: 旧 `PRICE`（通常価格＝上限）。既存バナー文言/テストはこの「通常価格」を表示する。 */
export const PRICE: Record<'ja' | 'default', { amount: number; display: string }> = {
  ja: { amount: PRICE_TABLE.jp.regular.amount, display: PRICE_TABLE.jp.regular.display },
  default: { amount: PRICE_TABLE.intl.regular.amount, display: PRICE_TABLE.intl.regular.display },
};

/** 買い切り提供の終了日時（UTC）。2026-09-30 23:59:59 JST ＝ 2026-09-30 14:59:59Z 相当の翌日境界。 */
export const OFFER_END_UTC = new Date('2026-09-30T14:59:59Z').getTime();
/** 表示用の提供終了日（顧客向け・T-29）。 */
export const OFFER_END_DISPLAY = '2026-09-30';

/** ロケールから課金市場を求める（ja のみ日本市場）。 */
export function marketForLocale(locale: Locale): Market {
  return locale === 'ja' ? 'jp' : 'intl';
}

/**
 * 現在時刻に応じた価格段階。決勝T開始（{@link KNOCKOUT_START_UTC}）より前は早割、以降は通常。
 * サーバ側でのみ評価し、クライアントの申告値は使わない。
 */
export function priceTier(now: Date): PriceTier {
  return now.getTime() < KNOCKOUT_START_UTC ? 'early' : 'regular';
}

/** 市場×現在時刻の価格情報を返す（Checkout セッションの金額決定に使う）。 */
export function currentPrice(market: Market, now: Date): PriceInfo {
  return PRICE_TABLE[market][priceTier(now)];
}

/** ロケール×現在時刻の表示価格（購入導線の表示に使う・早割/通常を反映）。 */
export function currentPriceDisplay(locale: Locale, now: Date): string {
  return currentPrice(marketForLocale(locale), now).display;
}

/**
 * 課金開始の境界。2026-06-29 00:00（日本時間, JST=UTC+9）＝ 2026-06-28T15:00:00Z（UTC）。
 * この瞬間より前が「無料期間」。
 * 根拠（実データ・2026-06-11 確認）: GL最終戦は JST 6/28 11:00 KO（13:00頃終了）、
 * 決勝T初戦は JST 6/29 04:00 KO。6/29 0:00 JST なら GL全試合が無料・決勝T初戦前に閉まる。
 * 利用規約・特商法にも同じ境界を JST/UTC 併記で明文化してある（変更時は両方更新）。
 * ISO 文字列で定義し、月の 0-index 誤読を避ける（テストでも値を固定検証）。
 */
export const KNOCKOUT_START_UTC = new Date('2026-06-28T15:00:00Z').getTime();

/** 現在ロケールの表示価格文字列（ja のみ ¥980、他は $10）。 */
export function priceDisplayForLocale(locale: Locale): string {
  return locale === 'ja' ? PRICE.ja.display : PRICE.default.display;
}

/**
 * ロケールの早割表示価格（時刻に依存しない・PRICE_TABLE の early が単一情報源）。
 * 予告バナー等、現在時刻に関わらず「早割 → 通常」を併記したい表示で使う。
 */
export function earlyPriceDisplayForLocale(locale: Locale): string {
  return PRICE_TABLE[marketForLocale(locale)].early.display;
}

/**
 * ロケールの通常表示価格（時刻に依存しない・PRICE_TABLE の regular が単一情報源）。
 * {@link priceDisplayForLocale} と同値だが、早割と対で読む箇所の意図を明示するための別名。
 */
export function regularPriceDisplayForLocale(locale: Locale): string {
  return PRICE_TABLE[marketForLocale(locale)].regular.display;
}

/**
 * 与えられた時刻が無料期間（決勝トーナメント開始前）か。
 * 予告バナーの表示可否に使う純粋関数（テスト可能・タイムゾーン非依存＝UTC 比較）。
 */
export function isFreePeriod(now: Date): boolean {
  return now.getTime() < KNOCKOUT_START_UTC;
}
