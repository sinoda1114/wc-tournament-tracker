import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'flag-icons/css/flag-icons.min.css';

import { ColorSchemeScript } from '@mantine/core';
import type { Metadata } from 'next';

import { SiteHeader } from '@/components/SiteHeader';

import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'WC 2026 決勝トーナメント',
  description: 'FIFAワールドカップ2026 決勝トーナメント進行トラッカー',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <Providers>
          <div className="wc-shell">
            <SiteHeader />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
