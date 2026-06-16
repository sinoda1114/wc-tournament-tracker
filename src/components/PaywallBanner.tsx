import { connection } from 'next/server';

import { auth } from '@clerk/nextjs/server';

import { AnchorLink } from '@/components/RouterLink';
import { hasActiveEntitlement } from '@/db/queries/billing';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import {
  earlyPriceDisplayForLocale,
  isFreePeriod,
  regularPriceDisplayForLocale,
} from '@/lib/pricing';

type PaywallBannerProps = {
  locale: Locale;
  dict: Dictionary;
};

/**
 * 決勝トーナメント課金壁の「予告バナー」（#26）。
 * 無料期間（グループステージ＝6/29 JST より前）のときだけ表示し、決勝T以降は何も出さない
 * （課金壁本体は #14 で実装）。価格・期間・文言は lib/pricing と i18n 辞書に集約し、
 * 価格は PRICE_TABLE（early/regular）を単一情報源として参照する（文言にハードコードしない）。
 *
 * 表示可否は現在時刻に依存するため `connection()` で**動的レンダリングを明示**する
 * （cookie 依存の暗黙 dynamic 化に頼らず、6/29 境界でバナーが静的キャッシュに固まる事故を防ぐ）。
 */
export async function PaywallBanner({ locale, dict }: PaywallBannerProps) {
  await connection();
  // 無料期間（決勝T開始前）以外は出さない。
  if (!isFreePeriod(new Date())) return null;

  // #26補足(T-14): 購入済みユーザーには予告バナーを出さない（恒久解放済みのため不要）。
  // 例外時は fail-open（バナーを出す）— バナーは非機密の告知なので過剰非表示を避ける。
  const { userId } = await auth();
  if (userId) {
    try {
      if (await hasActiveEntitlement(userId)) return null;
    } catch {
      // DB 障害時はバナー表示を継続（告知の取りこぼしを避ける）。
    }
  }

  const t = dict.paywall;
  // 早割（〜6/28）→ 通常（6/29〜）を併記。価格は PRICE_TABLE 由来（ハードコード重複なし）。
  const message = t.bannerMessage
    .replace('{earlyPrice}', earlyPriceDisplayForLocale(locale))
    .replace('{regularPrice}', regularPriceDisplayForLocale(locale));

  return (
    <aside className="wc-paywall-banner" aria-label={t.bannerAria}>
      <span className="wc-paywall-banner-text">{message}</span>
      <AnchorLink
        href="/buy"
        className="wc-paywall-banner-cta"
        aria-label={t.bannerCtaAria}
      >
        {t.bannerCta}
      </AnchorLink>
    </aside>
  );
}
