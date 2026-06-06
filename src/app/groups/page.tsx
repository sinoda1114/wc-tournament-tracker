import type { Metadata } from 'next';
import { Container, Group, Stack, Text, Title } from '@mantine/core';

import { DateFilterBar } from '@/components/DateFilterBar';
import { FavoriteFilterToggle } from '@/components/FavoriteFilterToggle';
import { GroupsFilterableGrid } from '@/components/GroupsFilterableGrid';
import { getGroupTeams, listGroupStageMatches } from '@/db/queries';
import { filterMatchesByDate, parseDateParam } from '@/lib/date-filter';

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
  const filter = parseDateParam(pickDateParam(params.date));
  const allMatches = await listGroupStageMatches();
  const filteredMatches = filterMatchesByDate(allMatches, filter);

  // 12 グループ分のチーム取得を並列で（軽量・48 行 SELECT × 12 = 全 teams 1 度より高速）。
  // 順位表は日付フィルターに関係なく「グループ全体の試合」から算出するため `allMatches` を使う。
  // 試合一覧は絞り込んだ `filteredMatches` を使い、特定日に試合が無いグループは見出しごと隠す。
  const groupData = await Promise.all(
    GROUP_LETTERS.map(async (letter) => {
      const teams = await getGroupTeams(letter);
      const standingsMatches = allMatches.filter((m) => m.groupLetter === letter);
      const visibleMatches = filteredMatches.filter((m) => m.groupLetter === letter);
      return { letter, teams, standingsMatches, visibleMatches };
    }),
  );

  const hideEmptyGroups = filter.kind === 'date';
  const visibleGroupData = hideEmptyGroups
    ? groupData.filter((g) => g.visibleMatches.length > 0)
    : groupData;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Group align="center" wrap="wrap" gap="sm">
            <Title order={1}>グループリーグ</Title>
            <FavoriteFilterToggle showHintWhenEmpty={false} />
          </Group>
          <Text c="dimmed">
            48ヶ国 × 12 グループの順位表と全 72 試合を一覧表示します（同勝点時は得失点差 → 総得点 → 直接対決の順で並びます）。
          </Text>
        </Stack>

        <div className="wc-groups-toolbar">
          <DateFilterBar />
        </div>

        {hideEmptyGroups && visibleGroupData.length === 0 ? (
          <div className="wc-groups-empty-date" role="status">
            <Text c="dimmed">この日に試合はありません。</Text>
          </div>
        ) : (
          <GroupsFilterableGrid
            groupData={visibleGroupData.map((g) => ({
              letter: g.letter,
              teams: g.teams,
              matches: g.visibleMatches,
              standingsMatches: g.standingsMatches,
            }))}
          />
        )}
      </Stack>
    </Container>
  );
}
