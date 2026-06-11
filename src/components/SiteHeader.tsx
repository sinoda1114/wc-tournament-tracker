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
      <Container size="xl" py="md">
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="lg" align="center" wrap="wrap">
            <Link href="/">
              <Title order={2} c="var(--wc-text)">
                MatchFav
              </Title>
            </Link>
            <SiteNav labels={dict.nav} groupPhase={isFreePeriod(new Date())} />
          </Group>
          <Group gap="sm" align="center" wrap="nowrap">
            {admin ? (
              <TextLink href="/admin" c="dimmed" size="sm">
                {dict.header.admin}
              </TextLink>
            ) : null}
            <LanguageSwitcher locale={locale} label={dict.language.label} />
            <TimeZonePicker label={dict.timezone.label} />
            <AddToHomeScreen />
            <ThemeToggle />
            {user ? (
              <UserButton />
            ) : (
              <TextLink href="/sign-in" c="dimmed" size="sm">
                {dict.header.signIn}
              </TextLink>
            )}
          </Group>
        </Group>
      </Container>
    </header>
  );
}
