import { Container, Stack, Text, Title } from '@mantine/core';

import { FavoritesPageView } from '@/components/FavoritesPageView';
import { listAllTeams, listTournamentMatches } from '@/db/queries';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const [teams, matches] = await Promise.all([
    listAllTeams(),
    listTournamentMatches(),
  ]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>お気に入りチーム</Title>
          <Text c="dimmed">
            48ヶ国から気になるチームを ★ で選ぶと、決勝T・グループリーグの試合カードに金色の枠が付き、
            「お気に入りのみ」フィルターで素早く確認できるようになります。設定はこのブラウザに保存されます。
          </Text>
        </Stack>

        <FavoritesPageView teams={teams} matches={matches} />
      </Stack>
    </Container>
  );
}
