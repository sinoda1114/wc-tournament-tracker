import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { auth, currentUser } from '@clerk/nextjs/server';
import { Container, Group, Title } from '@mantine/core';

import { TextLink } from '@/components/RouterLink';
import { isAdminUser } from '@/lib/auth';
import { isFreePeriod } from '@/lib/pricing';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';

import { AddToHomeScreen } from './AddToHomeScreen';
import { HeaderControls } from './HeaderControls';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SiteNav } from './SiteNav';
import { ThemeToggle } from './ThemeToggle';
import { TimeZonePicker } from './TimeZonePicker';

type SiteHeaderProps = {
  locale: Locale;
  dict: Dictionary;
};

export async function SiteHeader({ locale, dict }: SiteHeaderProps) {
  // userId は JWT から軽量に取れる。未ログインの公開ページでは currentUser()
  // （Clerk バックエンド取得）を呼ばず、ログイン時のみ取得してレイテンシを抑える。
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const admin = isAdminUser(user);

  return (
    <header className="wc-header">
      <Container size="xl" className="wc-header-inner">
        <Group justify="space-between" align="center" wrap="nowrap" gap="md">
          <Group gap="lg" align="center" wrap="wrap" className="wc-header-brand">
            <Link href="/" className="wc-header-logo">
              <Title order={2} c="var(--wc-text)">
                MatchFav
              </Title>
            </Link>
            <SiteNav labels={dict.nav} groupPhase={isFreePeriod(new Date())} />
          </Group>
          {/* 低優先操作（言語/TZ/テーマ/DL/管理）はモバイルでバーガー→Drawer に集約。
              UserButton（ログイン中のみ）は本人導線として常時 inline。#37/T-55 */}
          <HeaderControls
            menuLabel={dict.header.menu}
            settingsLabel={dict.header.settings}
            account={user ? <UserButton /> : undefined}
            adminLink={
              admin ? (
                <TextLink href="/admin" c="dimmed" size="sm">
                  {dict.header.admin}
                </TextLink>
              ) : undefined
            }
          >
            <LanguageSwitcher locale={locale} label={dict.language.label} />
            <TimeZonePicker label={dict.timezone.label} />
            <AddToHomeScreen />
            <ThemeToggle />
          </HeaderControls>
        </Group>
      </Container>
    </header>
  );
}
