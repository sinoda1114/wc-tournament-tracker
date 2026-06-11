import type { Metadata } from 'next';
import { Container, Group, Stack, Text, Title } from '@mantine/core';

import { DateFilterBar } from '@/components/DateFilterBar';
import { FavoriteFilterToggle } from '@/components/FavoriteFilterToggle';
import { GroupsFilterableGrid } from '@/components/GroupsFilterableGrid';
import { MatchDayList } from '@/components/MatchDayList';
import {
  getGroupTeams,
  listGroupStageMatches,
  listTournamentMatches,
} from '@/db/queries';
import { parseDatesParam } from '@/lib/date-filter';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'グループリーグ',
  description:
    '48ヶ国 × 12 グループの順位表と全 72 試合。WC 2026 のグループリーグを日程・結果つきで一覧できます。',
  alternates: { canonical: '/groups' },
};

const GROUP_LETTERS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
] as const;

type GroupsPageProps = {
  searchParams: Promise<{ date?: string | string[] }>;
};

function pickDateParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const params = await searchParams;
  const selectedDates = parseDatesParam(pickDateParam(params.date));
  const dict = getDictionary(await resolveLocale());
  const isDate = selectedDates.length > 0;

  // 日付選択時は GL＋決勝T 横断の「その日の全試合」。未選択時は順位表グリッド（全グループ）。
  const dayMatches = isDate
    ? [...(await listGroupStageMatches()), ...(await listTournamentMatches())]
    : [];

  const allGroupMatches = isDate ? [] : await listGroupStageMatches();
  const groupData = isDate
    ? []
    : await Promise.all(
        GROUP_LETTERS.map(async (letter) => {
          const teams = await getGroupTeams(letter);
          const matches = allGroupMatches.filter((m) => m.groupLetter === letter);
          return { letter, teams, matches, standingsMatches: matches };
        }),
      );

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Group align="center" wrap="wrap" gap="sm">
            <Title order={1}>{dict.groups.title}</Title>
            <FavoriteFilterToggle showHintWhenEmpty={false} />
          </Group>
          <Text c="dimmed">{dict.groups.description}</Text>
        </Stack>

        <div className="wc-groups-toolbar">
          <DateFilterBar />
        </div>

        {isDate ? (
          selectedDates.map((date) => (
            <MatchDayList key={date} matches={dayMatches} date={date} />
          ))
        ) : (
          <GroupsFilterableGrid groupData={groupData} />
        )}
      </Stack>
    </Container>
  );
}
