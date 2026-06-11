import type { Metadata } from 'next';

import { HomeView, type HomeSearchParams } from '@/components/HomeView';
import { buildAlternates, ogLocale } from '@/lib/i18n/alternates';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/**
 * 既定ロケール（ja）トップの metadata。ロケール別 title/description＋
 * hreflang（全ロケール＋x-default=ja）を出す。ja は `/`（プレフィックス無し）。
 * locale は resolveLocale()（cookie/既定）で解決＝言語スイッチャーで切替えても整合する。
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const { title, description } = getDictionary(locale).meta.home;
  const alternates = buildAlternates('home', locale);
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: 'website',
      siteName: 'MatchFav',
      title,
      description,
      url: alternates.canonical,
      locale: ogLocale(locale),
    },
    twitter: { title, description },
  };
}

export default function HomePage({ searchParams }: { searchParams: Promise<HomeSearchParams> }) {
  return <HomeView searchParams={searchParams} />;
}
