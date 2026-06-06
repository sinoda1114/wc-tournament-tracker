import type { Metadata } from 'next';
import { Container } from '@mantine/core';

import { TeamExplorer } from '@/components/TeamExplorer';
import { listAllTeams } from '@/db/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '出場国一覧',
  description:
    'WC 2026 の出場国を一覧・検索できます。各国の代表メンバーや監督、所属グループを確認できます。',
  alternates: { canonical: '/teams' },
};

export default async function TeamsPage() {
  const teams = await listAllTeams();

  return (
    <Container size="xl" py="xl">
      <TeamExplorer teams={teams} />
    </Container>
  );
}
