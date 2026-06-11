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
 * 無料期間（グループステージ＝6/29 JST より前）のときだけ表示し、決勝T以降は何も出さない
 * （課金壁本体は #14 で実装）。価格・期間・文言は lib/pricing と i18n 辞書に集約し、
 * #14 で価格が確定したら定数1箇所の差し替えで反映できる。
 *
 * 表示可否は現在時刻に依存するため `connection()` で**動的レンダリングを明示**する
 * （cookie 依存の暗黙 dynamic 化に頼らず、6/29 境界でバナーが静的キャッシュに固まる事故を防ぐ）。
 */
export async function PaywallBanner({ locale, dict }: PaywallBannerProps) {
  await connection();
  // TODO(#14): 課金(entitlement)実装後、購入者にはこのバナーを出さない。
  //   ここに「entitlement 未保有のときだけ表示」の条件を1つ足す:
  //   const hasEntitlement = await getEntitlement(); if (hasEntitlement) return null;
  //   現状は決済導線が無く購入者ゼロのため、無料期間中は全員に表示するのが正しい。
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
