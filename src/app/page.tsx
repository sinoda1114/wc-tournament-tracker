import type { Metadata } from 'next';

import { HomeView, type HomeSearchParams } from '@/components/HomeView';
import { buildAlternates, ogLocale } from '@/lib/i18n/alternates';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

const ROOT_OG_IMAGE = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: 'MatchFav（マッチファボ）',
};

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
    // 文字列にブランド名を内包したので template（%s | MatchFav）の二重付与を防ぐ＝absolute。
    title: { absolute: title },
    description,
    alternates,
    openGraph: {
      type: 'website',
      // 指名検索（ブランド名検索）対策でカタカナ併記。layout の siteName と揃える。
      siteName: 'MatchFav（マッチファボ）',
      title,
      description,
      url: alternates.canonical,
      locale: ogLocale(locale),
      images: [ROOT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ROOT_OG_IMAGE.url],
    },
  };
}

export default function HomePage({ searchParams }: { searchParams: Promise<HomeSearchParams> }) {
  return <HomeView searchParams={searchParams} />;
}
