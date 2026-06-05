import Link from 'next/link';
import { Container, Group, Text, Title } from '@mantine/core';

import { SiteNav } from './SiteNav';
import { ThemeToggle } from './ThemeToggle';

type SiteHeaderProps = {
  showAdminLink?: boolean;
};

export function SiteHeader({ showAdminLink = true }: SiteHeaderProps) {
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
            <SiteNav />
          </Group>
          <Group gap="sm" align="center" wrap="nowrap">
            {showAdminLink ? (
              <Text component={Link} href="/admin" c="dimmed" size="sm">
                管理画面
              </Text>
            ) : null}
            <ThemeToggle />
          </Group>
        </Group>
      </Container>
    </header>
  );
}
