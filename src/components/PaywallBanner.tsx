import { connection } from 'next/server';

import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { isFreePeriod, priceDisplayForLocale } from '@/lib/pricing';

type PaywallBannerProps = {
  locale: Locale;
  dict: Dictionary;
};

/**
 * 決勝トーナメント課金壁の「予告バナー」（#26）。
 * 無料期間（グループステージ＝6/28 JST より前）のときだけ表示し、決勝T以降は何も出さない
 * （課金壁本体は #14 で実装）。価格・期間・文言は lib/pricing と i18n 辞書に集約し、
 * #14 で価格が確定したら定数1箇所の差し替えで反映できる。
 *
 * 表示可否は現在時刻に依存するため `connection()` で**動的レンダリングを明示**する
 * （cookie 依存の暗黙 dynamic 化に頼らず、6/28 境界でバナーが静的キャッシュに固まる事故を防ぐ）。
 */
export async function PaywallBanner({ locale, dict }: PaywallBannerProps) {
  await connection();
  if (!isFreePeriod(new Date())) return null;

  const t = dict.paywall;
  const message = t.bannerMessage.replace('{price}', priceDisplayForLocale(locale));

  return (
    <aside className="wc-paywall-banner" aria-label={t.bannerAria}>
      <span className="wc-paywall-banner-text">
        <span aria-hidden="true">🏆</span> {message}
      </span>
    </aside>
  );
}
