import { Container } from '@mantine/core';

import { TeamExplorer } from '@/components/TeamExplorer';
import { listAllTeams } from '@/db/queries';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const teams = await listAllTeams();

  return (
    <Container size="xl" py="xl">
      <TeamExplorer teams={teams} />
    </Container>
  );
}
