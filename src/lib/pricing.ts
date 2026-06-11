import type { Locale } from '@/lib/i18n/config';

/**
 * 価格・無料期間の単一情報源（#26 予告バナー / #14 課金で共用）。
 *
 * 課金動線（2026-06-11 確定・launch-monetization-plan）:
 *  - グループステージ（最終戦は JST 6/28 11:00 KO・13:00頃終了）は全登録者無料。
 *  - 決勝トーナメント（初戦 R32 = JST 6/29 04:00 KO）から買い切り課金。
 *  - 価格は市場ごとに非パリティ: 日本 ¥980 / 海外 $10。
 */

/** 表示用の価格（ロケール別）。`#14` の Stripe Price 選択もこの定数を流用する。 */
export const PRICE: Record<'ja' | 'default', { amount: number; display: string }> = {
  ja: { amount: 980, display: '¥980' },
  default: { amount: 10, display: '$10' },
};

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
 * 与えられた時刻が無料期間（決勝トーナメント開始前）か。
 * 予告バナーの表示可否に使う純粋関数（テスト可能・タイムゾーン非依存＝UTC 比較）。
 */
export function isFreePeriod(now: Date): boolean {
  return now.getTime() < KNOCKOUT_START_UTC;
}
