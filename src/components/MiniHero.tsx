import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Button } from '@mantine/core';

import type { Dictionary } from '@/lib/i18n/dictionary';

type MiniHeroProps = {
  dict: Dictionary;
};

/**
 * トップページ最上部の未ログイン訪問者向けミニヒーロー（#37）。
 *
 * 独立LPは作らない判断（台帳 #37）：無料期間は製品自体が営業であり、
 * LPの役目（これは何のサイトか・無料であること・始め方）をこの帯が代替する。
 * ログイン済みユーザーには何も描画しない（既存体験を変えない）。
 * 課金予告は PaywallBanner の担当なので、ここでは価格・期限に触れない。
 */
export async function MiniHero({ dict }: MiniHeroProps) {
  const { userId } = await auth();
  if (userId) return null;

  const t = dict.home;

  return (
    <section className="wc-mini-hero" aria-label={t.heroTitle}>
      <div className="wc-mini-hero-body">
        <h2 className="wc-mini-hero-title">{t.heroTitle}</h2>
        <p className="wc-mini-hero-lead">{t.heroLead}</p>
      </div>
      <Button component={Link} href="/sign-in" size="md" radius="md">
        {t.heroCta}
      </Button>
    </section>
  );
}
