import { Container, Stack, Text, Title } from '@mantine/core';

import { FavoritesPageView } from '@/components/FavoritesPageView';
import { listAllTeams, listTournamentMatches } from '@/db/queries';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const [teams, matches] = await Promise.all([
    listAllTeams(),
    listTournamentMatches(),
  ]);

  const t = getDictionary(await resolveLocale()).favorites;

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
