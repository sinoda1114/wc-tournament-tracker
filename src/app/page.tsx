import { Container, Group, Stack, Text, Title } from '@mantine/core';

import { DateFilterBar } from '@/components/DateFilterBar';
import { FavoriteFilterToggle } from '@/components/FavoriteFilterToggle';
import { MatchDayList } from '@/components/MatchDayList';
import { TournamentViewToggle } from '@/components/TournamentViewToggle';
import { listGroupStageMatches, listTournamentMatches } from '@/db/queries';
import { parseDateParam } from '@/lib/date-filter';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams: Promise<{ date?: string | string[] }>;
};

function pickDateParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const filter = parseDateParam(pickDateParam(params.date));
  const dict = getDictionary(await resolveLocale());

  // 決勝Tのブラケット用（未選択時）。日付選択時は GL＋決勝T 横断の日別一覧に切替える。
  const knockoutMatches = await listTournamentMatches();
  const dayMatches =
    filter.kind === 'date'
      ? [...(await listGroupStageMatches()), ...knockoutMatches]
      : [];

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Group align="center" wrap="wrap" gap="sm">
            <Title order={1}>{dict.home.title}</Title>
            <FavoriteFilterToggle showHintWhenEmpty={false} />
          </Group>
          <Text c="dimmed">{dict.home.description}</Text>
        </Stack>

        <div className="wc-groups-toolbar">
          <DateFilterBar />
        </div>

        {filter.kind === 'date' ? (
          <MatchDayList matches={dayMatches} date={filter.date} />
        ) : (
          <TournamentViewToggle matches={knockoutMatches} />
        )}
      </Stack>
    </Container>
  );
}
