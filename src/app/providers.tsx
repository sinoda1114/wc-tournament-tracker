'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: "'Segoe UI', 'Hiragino Sans', 'Yu Gothic UI', sans-serif",
  defaultRadius: 'md',
});

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <DatesProvider settings={{ locale: 'ja', timezone: 'Asia/Tokyo' }}>
        {children}
      </DatesProvider>
    </MantineProvider>
  );
}
