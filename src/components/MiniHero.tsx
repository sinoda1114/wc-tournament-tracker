import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

import type { Dictionary } from '@/lib/i18n/dictionary';

type MiniHeroProps = {
  dict: Dictionary;
};

/**
 * トップページ最上部の未ログイン訪問者向けヒーロー（#37）。
 *
 * 独立LPは作らない判断（台帳 #37）：無料期間は製品自体が営業であり、
 * LPの役目（コンセプト・特徴・無料であること・始め方）をこの帯が代替する。
 * ログイン済みユーザーには何も描画しない（既存体験を変えない）。
 * 価格・期限は PaywallBanner の担当なので、ここでは触れない。
 */
export async function MiniHero({ dict }: MiniHeroProps) {
  const { userId } = await auth();
  if (userId) return null;

  const t = dict.home;

  return (
    <section className="wc-mini-hero" aria-label={t.heroTitle}>
      <div className="wc-mini-hero-body">
        <h2 className="wc-mini-hero-title">{t.heroTitle}</h2>
        <p className="wc-mini-hero-tagline">{t.heroTagline}</p>
        <ul className="wc-mini-hero-points">
          <li>{t.heroPoint1}</li>
          <li>{t.heroPoint2}</li>
          <li>{t.heroPoint3}</li>
        </ul>
      </div>
      <div className="wc-mini-hero-action">
        {/* Server Component から Mantine Button(client) へ component={Link}（関数）は
            渡せない（RSC のシリアライズ制約）ため、素の Link に CSS でボタン見た目を付ける。 */}
        <Link href="/sign-in" className="wc-mini-hero-cta">
          {t.heroCta}
        </Link>
        <p className="wc-mini-hero-lead">{t.heroLead}</p>
      </div>
    </section>
  );
}
