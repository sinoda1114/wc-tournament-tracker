import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HomeView, type HomeSearchParams } from '@/components/HomeView';
import { buildAlternates, ogLocale } from '@/lib/i18n/alternates';
import { LOCALES, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';

// generateStaticParams が返す en/es/pt/zh 以外のロケール（/ja・/zzz 等）は 404 にする。
// 重要: かつて `export const dynamic = 'force-dynamic'` を付けていたが、force-dynamic 下では
// この dynamicParams=false が無効化され、無効ロケールが 200（ソフト404）になっていた（#52 残課題）。
// このページは searchParams を読む＝元々リクエスト単位の動的レンダリングなので、
// force-dynamic は不要。外すことで dynamicParams=false が本来どおり効き、未登録ロケールが
// ルーティング段で 404 になる（ビルド時 SSG もされないため DB を叩かない）。
export const dynamicParams = false;

/** プレフィックス付きで有効なロケール（既定 ja は `/` なので除外）。 */
const PREFIX_LOCALES = LOCALES.filter((l) => l !== 'ja');

/**
 * 無効なロケール（/zzz・/ja 等）の多重防御。通常は上記 dynamicParams=false が
 * ルーティング段で 404 にするが、generateMetadata/描画の両経路でも明示的に弾く。
 */
function resolveLocale(locale: string): Locale {
  if ((PREFIX_LOCALES as string[]).includes(locale)) {
    return locale as Locale;
  }
  notFound();
}

/**
 * 公開トップのロケール別URL（#19 B-lite）。対象は en/es/pt/zh のみ。
 * 既定の ja は `/`（プレフィックス無し）なのでここには含めない。
 */
export function generateStaticParams(): { locale: Locale }[] {
  return PREFIX_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolveLocale(locale);
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

export default async function LocaleHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<HomeSearchParams>;
}) {
  const { locale } = await params;
  resolveLocale(locale); // 無効ロケールは 404
  // 描画ロケールは middleware が付与する x-wc-locale ヘッダ経由で HomeView/layout に伝わる。
  return <HomeView searchParams={searchParams} />;
}
