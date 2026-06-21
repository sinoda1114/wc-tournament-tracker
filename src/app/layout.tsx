import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'flag-icons/css/flag-icons.min.css';

import { ClerkProvider } from '@clerk/nextjs';
import { ColorSchemeScript } from '@mantine/core';
import type { Metadata, Viewport } from 'next';

import { CookieConsent } from '@/components/CookieConsent';
import { JsonLd } from '@/components/JsonLd';
import { PaywallBanner } from '@/components/PaywallBanner';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getSiteUrl, getSiteUrlObject } from '@/lib/env';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale, resolveTimeZone } from '@/lib/i18n/server';
import { buildOrganization, buildWebSite } from '@/lib/structured-data';

import { Providers } from './providers';
import './globals.css';

// サイト共通のメタ情報。タイトルは各ページの title をテンプレートで包む。
// ブランドは MatchFav（2026-06-11 確定）。大会名は名前に含めず説明文の記述的使用に留め、
// 「FIFA」綴り・図形商標・公式提携の示唆は使わない（知財対策。非公式である旨を必ず併記）。
const SITE_NAME = 'MatchFav';
// 指名検索（ブランド名検索）でカタカナ「マッチファボ」でも当たるよう、英字とカタカナを併記する。
const SITE_NAME_WITH_KANA = 'MatchFav（マッチファボ）';
const SITE_TITLE_DEFAULT =
  'MatchFav（マッチファボ）— サッカー2026 試合・優勝予想・お気に入りトラッカー（非公式）';
const SITE_DESCRIPTION =
  'MatchFav（マッチファボ）は、ワールドカップ2026の日程・結果・優勝予想・お気に入りをひとつにまとめる非公式ファンサイトです（FIFA非公認）。';
const SITE_OG_IMAGE = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: 'MatchFav（マッチファボ）',
};

export const metadata: Metadata = {
  // 相対 URL（OGP 画像・canonical 等）の基準。env 依存（未設定時はフォールバック）。
  metadataBase: getSiteUrlObject(),
  title: {
    default: SITE_TITLE_DEFAULT,
    // 各ページが title 文字列を返すと「<title> | MatchFav」になる。
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // 指名検索（ブランド名検索）対策。カタカナ／英字どちらの綴りでも引っかかるよう両方を列挙する。
  keywords: ['MatchFav', 'マッチファボ', 'マッチファブ', 'ワールドカップ2026', 'W杯2026', '優勝予想'],
  // manifest.ts を参照（PWA）。
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  // canonical/hreflang は各ページの generateMetadata で出す（layout に置くと全ページ
  // canonical='/' になり得るため。トップは #19 でロケール別 canonical＋hreflang を出力）。
  openGraph: {
    type: 'website',
    siteName: SITE_NAME_WITH_KANA,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    locale: 'ja_JP',
    url: '/',
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE.url],
  },
  // 非公式サイトである旨を明示（FIFA 等との混同回避／知財対策の補強）。
  other: {
    'fan-site': 'unofficial',
  },
};

/**
 * <html lang> 用の BCP-47 タグへ変換する。中国語はグリフが地域差を持つため
 * 簡体字（zh-Hans）を明示し、CJK 統合漢字が日本語字形で描画されるのを防ぐ。
 * globals.css の :lang(zh) / html[lang^="zh"] セレクタもこの値に合わせる。
 */
function toHtmlLang(locale: Locale): string {
  return locale === 'zh' ? 'zh-Hans' : locale;
}

export const viewport: Viewport = {
  // ブラウザ UI 着色。ダーク既定（濃紺）／ライト時はブルー寄りにする。
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
    { media: '(prefers-color-scheme: light)', color: '#1e3a8a' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await resolveLocale();
  const dict = getDictionary(locale);
  const timeZone = await resolveTimeZone();

  // 指名検索（ブランド名検索）強化のための JSON-LD。Organization / WebSite に
  // alternateName=「マッチファボ」を載せ、カタカナ綴りを英字 MatchFav の同義語として伝える。
  // 絶対 URL は env（NEXT_PUBLIC_SITE_URL）経由。全ページ共通なのでルート layout に置く。
  const siteUrl = getSiteUrl();
  const siteJsonLd = [buildOrganization(siteUrl), buildWebSite(siteUrl)];

  return (
    // afterSignOutUrl: サインアウト後は Clerk の Account Portal を経由せず自前の公開トップ（/）へ
    // 直接戻す。未設定だと account portal 経由でハング/スピンし続ける事象があるため明示する。
    <ClerkProvider afterSignOutUrl="/">
      <html lang={toHtmlLang(locale)} suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        {/* サイト全体の構造化データ（Organization / WebSite）。ブランド名の指名検索（T-54）対策。 */}
        <JsonLd data={siteJsonLd} />
      </head>
      <body>
        <Providers locale={locale} dict={dict} timeZone={timeZone}>
          {/*
            フッタを常にビューポート下端へ送るための縦フレックス。wc-shell（globals.css）は
            min-height だけを持つので、レイアウト用の flex はここでインライン指定し、
            globals.css には手を入れない。main を flex:1 で伸ばしてフッタを押し下げる。
          */}
          {/* キーボード/スクリーンリーダ向け: ヘッダのナビを飛ばして本文へ（WCAG 2.4.1）。
              通常は画面外、Tab でフォーカスされたときだけ可視化する（.wc-skip-link）。 */}
          <a href="#main-content" className="wc-skip-link">
            {dict.header.skipToContent}
          </a>
          <div className="wc-shell" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="wc-sticky-header-group">
              <SiteHeader locale={locale} dict={dict} />
              <PaywallBanner locale={locale} dict={dict} />
            </div>
            <main id="main-content" style={{ flex: 1 }}>
              {children}
            </main>
            <SiteFooter t={dict.footer} />
          </div>
          <CookieConsent />
        </Providers>
      </body>
      </html>
    </ClerkProvider>
  );
}
