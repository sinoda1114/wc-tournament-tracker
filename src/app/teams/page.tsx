import type { Metadata } from 'next';
import { Container, Stack } from '@mantine/core';

import { ChampionPredictionSection } from '@/components/ChampionPredictionSection';
import { TeamExplorer } from '@/components/TeamExplorer';
import { listAllTeams } from '@/db/queries';
import { ogLocale } from '@/lib/i18n/alternates';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

// T-19: ロケール対応 metadata。canonical は単一URL（/teams）固定で hreflang は付けない。
export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const { title, description } = getDictionary(locale).meta.teams;
  return {
    title,
    description,
    alternates: { canonical: '/teams' },
    openGraph: { title, description, url: '/teams', locale: ogLocale(locale) },
    twitter: { title, description },
  };
}

export default async function TeamsPage() {
  const teams = await listAllTeams();

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* 優勝予想を上部に表示（/prediction と共通・T-47系の横展開）。 */}
        <ChampionPredictionSection />
        <TeamExplorer teams={teams} />
      </Stack>
    </Container>
  );
}
