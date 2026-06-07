'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

import type { Locale } from '@/lib/i18n/config';
import { I18nProvider } from '@/lib/i18n/context';
import type { Dictionary } from '@/lib/i18n/dictionary';

dayjs.locale('ja');

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: "'Segoe UI', 'Hiragino Sans', 'Yu Gothic UI', sans-serif",
  defaultRadius: 'md',
});

type ProvidersProps = {
  children: React.ReactNode;
  locale: Locale;
  dict: Dictionary;
  timeZone: string;
};

export function Providers({ children, locale, dict, timeZone }: ProvidersProps) {
  return (
    <I18nProvider locale={locale} dict={dict} timeZone={timeZone}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        {/* 日付ピッカーは全言語で英語表記に統一（月名・曜日。サッカーファンに十分通じる）。 */}
        <DatesProvider settings={{ locale: 'en' }}>
          {children}
        </DatesProvider>
      </MantineProvider>
    </I18nProvider>
  );
}
