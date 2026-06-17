import type { Metadata } from 'next';
import { Container, Stack, Text, Title } from '@mantine/core';

import { FavoritesPageView } from '@/components/FavoritesPageView';
import { PaywallLock } from '@/components/billing/PaywallLock';
import { listAllTeams, listTournamentMatches } from '@/db/queries';
import { hasKnockoutAccess } from '@/lib/billing/access';
import { ogLocale } from '@/lib/i18n/alternates';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

// T-19: ロケール対応 metadata。canonical は単一URL（/favorites）固定で hreflang は付けない。
export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const { title, description } = getDictionary(locale).meta.favorites;
  return {
    title,
    description,
    alternates: { canonical: '/favorites' },
    openGraph: { title, description, url: '/favorites', locale: ogLocale(locale) },
    twitter: { title, description },
  };
}

export default async function FavoritesPage() {
  const locale = await resolveLocale();
  const dict = getDictionary(locale);
  const t = dict.favorites;

  // 決勝T課金壁（T-68 面④）: お気に入りは未購入×決勝T期間では本体を出さず PaywallLock に差し替える。
  // ヘッダ（タイトル/説明）は残し、本体だけロックに置き換える。アクセス可のときだけ重い取得を行う。
  if (!(await hasKnockoutAccess())) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1}>{t.pageTitle}</Title>
            <Text c="dimmed">{t.pageDescription}</Text>
          </Stack>

          <PaywallLock locale={locale} dict={dict} />
        </Stack>
      </Container>
    );
  }

  const [teams, matches] = await Promise.all([
    listAllTeams(),
    listTournamentMatches(),
  ]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>{t.pageTitle}</Title>
          <Text c="dimmed">{t.pageDescription}</Text>
        </Stack>

        <FavoritesPageView teams={teams} matches={matches} />
      </Stack>
    </Container>
  );
}
