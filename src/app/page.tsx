import { Container, Group, Stack, Text, Title } from '@mantine/core';

import { FavoriteFilterToggle } from '@/components/FavoriteFilterToggle';
import { TournamentViewToggle } from '@/components/TournamentViewToggle';
import { listTournamentMatches } from '@/db/queries';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const matches = await listTournamentMatches();

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Group align="center" wrap="wrap" gap="sm">
            <Title order={1}>決勝トーナメント表</Title>
            <FavoriteFilterToggle showHintWhenEmpty={false} />
          </Group>
          <Text c="dimmed">
            試合結果を更新すると、勝者が次の試合へ自動反映されます。スマホでは横スクロールで全ラウンドを確認できます。
          </Text>
        </Stack>
        <TournamentViewToggle matches={matches} />
      </Stack>
    </Container>
  );
}
