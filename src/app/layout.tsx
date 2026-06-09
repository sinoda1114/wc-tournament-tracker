import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'flag-icons/css/flag-icons.min.css';

import { ClerkProvider } from '@clerk/nextjs';
import { ColorSchemeScript } from '@mantine/core';
import type { Metadata, Viewport } from 'next';

import { CookieConsent } from '@/components/CookieConsent';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getSiteUrlObject } from '@/lib/env';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale, resolveTimeZone } from '@/lib/i18n/server';

import { Providers } from './providers';
import './globals.css';

// サイト共通のメタ情報。タイトルは各ページの title をテンプレートで包む。
// 文面は「FIFA」「ワールドカップ」等の正式名称を商標的に使わない方針（知財対策）に沿わせる。
const SITE_NAME = 'WC 2026 決勝トーナメント トラッカー';
const SITE_DESCRIPTION =
  '2026年の国際サッカー大会の決勝トーナメント・グループリーグの日程/結果/出場国を、ファン向けにまとめる非公式トラッカーです。';

export const metadata: Metadata = {
  // 相対 URL（OGP 画像・canonical 等）の基準。env 依存（未設定時はフォールバック）。
  metadataBase: getSiteUrlObject(),
  title: {
    default: SITE_NAME,
    // 各ページが title 文字列を返すと「<title> | WC 2026 …トラッカー」になる。
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // manifest.ts を参照（PWA）。
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: 'ja_JP',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
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

  return (
    <ClerkProvider>
      <html lang={toHtmlLang(locale)} suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
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
            <SiteHeader locale={locale} dict={dict} />
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
