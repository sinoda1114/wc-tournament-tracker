import type { Metadata } from 'next';

import { HomeView, type HomeSearchParams } from '@/components/HomeView';
import { buildAlternates, ogLocale } from '@/lib/i18n/alternates';
import { LOCALES, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';

export const dynamic = 'force-dynamic';
// generateStaticParams 以外のロケール（/ja・/foo 等）は 404 にする。
export const dynamicParams = false;

/**
 * 公開トップのロケール別URL（#19 B-lite）。対象は en/es/pt/zh のみ。
 * 既定の ja は `/`（プレフィックス無し）なのでここには含めない。
 */
export function generateStaticParams(): { locale: Locale }[] {
  return LOCALES.filter((l) => l !== 'ja').map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  // generateStaticParams + dynamicParams=false により locale は en/es/pt/zh に限定済み。
  const { locale } = await params;
  const loc = locale as Locale;
  const { title, description } = getDictionary(loc).meta.home;
  const alternates = buildAlternates('home', loc);
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
      locale: ogLocale(loc),
    },
    twitter: { title, description },
  };
}

export default function LocaleHomePage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<HomeSearchParams>;
}) {
  // 描画ロケールは middleware が付与する x-wc-locale ヘッダ経由で HomeView/layout に伝わる。
  return <HomeView searchParams={searchParams} />;
}
