import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'flag-icons/css/flag-icons.min.css';

import { ClerkProvider } from '@clerk/nextjs';
import { ColorSchemeScript } from '@mantine/core';
import type { Metadata, Viewport } from 'next';

import { CookieConsent } from '@/components/CookieConsent';
import { PaywallBanner } from '@/components/PaywallBanner';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getSiteUrlObject } from '@/lib/env';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale, resolveTimeZone } from '@/lib/i18n/server';

import { Providers } from './providers';
import './globals.css';

// サイト共通のメタ情報。タイトルは各ページの title をテンプレートで包む。
// ブランドは MatchFav（2026-06-11 確定）。大会名は名前に含めず説明文の記述的使用に留め、
// 「FIFA」綴り・図形商標・公式提携の示唆は使わない（知財対策。非公式である旨を必ず併記）。
const SITE_NAME = 'MatchFav';
const SITE_TITLE_DEFAULT = 'MatchFav — W杯2026 試合・優勝予想・お気に入りトラッカー（非公式）';
const SITE_DESCRIPTION =
  'MatchFav（マッチファボ）は、ワールドカップ2026の日程・結果・優勝予想・お気に入りをひとつにまとめる非公式ファンサイトです（FIFA非公認）。';

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
  // manifest.ts を参照（PWA）。
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    locale: 'ja_JP',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE_DEFAULT,
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
            <PaywallBanner locale={locale} dict={dict} />
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
