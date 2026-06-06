import Link from 'next/link';
import { Container, Group, Title } from '@mantine/core';

import { TextLink } from '@/components/RouterLink';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';

import { AddToHomeScreen } from './AddToHomeScreen';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SiteNav } from './SiteNav';
import { ThemeToggle } from './ThemeToggle';

type SiteHeaderProps = {
  locale: Locale;
  dict: Dictionary;
  showAdminLink?: boolean;
};

export function SiteHeader({ locale, dict, showAdminLink = true }: SiteHeaderProps) {
  return (
    <header className="wc-header">
      <Container size="xl" py="md">
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="lg" align="center" wrap="wrap">
            <Link href="/">
              <Title order={2} c="var(--wc-text)">
                WC 2026
              </Title>
            </Link>
            <SiteNav labels={dict.nav} />
          </Group>
          <Group gap="sm" align="center" wrap="nowrap">
            {showAdminLink ? (
              <TextLink href="/admin" c="dimmed" size="sm">
                {dict.header.admin}
              </TextLink>
            ) : null}
            <LanguageSwitcher locale={locale} label={dict.language.label} />
            <AddToHomeScreen />
            <ThemeToggle />
          </Group>
        </Group>
      </Container>
    </header>
  );
}
