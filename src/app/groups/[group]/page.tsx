import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Anchor, Container, Stack, Text, Title } from '@mantine/core';

import { DateFilterBar } from '@/components/DateFilterBar';
import { FavoriteFilterToggle } from '@/components/FavoriteFilterToggle';
import { GroupCard } from '@/components/GroupCard';
import { getGroupTeams, listGroupMatches } from '@/db/queries';
import { filterMatchesByDate, parseDateParam } from '@/lib/date-filter';

export const dynamic = 'force-dynamic';

const VALID_GROUPS = new Set([
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
]);

type PageProps = {
  params: Promise<{ group: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
};

function pickDateParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function GroupDetailPage({ params, searchParams }: PageProps) {
  const { group } = await params;
  const sp = await searchParams;
  const lower = group.toLowerCase();
  if (!VALID_GROUPS.has(lower)) {
    notFound();
  }
  const letter = lower.toUpperCase();

  const filter = parseDateParam(pickDateParam(sp.date));

  const [teams, matches] = await Promise.all([
    getGroupTeams(letter),
    listGroupMatches(letter),
  ]);

  const filteredMatches = filterMatchesByDate(matches, filter);
  const showEmptyDate = filter.kind === 'date' && filteredMatches.length === 0;

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Anchor component={Link} href="/groups" c="dimmed" size="sm">
            ← グループリーグ一覧
          </Anchor>
          <Title order={1}>グループ{letter}</Title>
          <Text c="dimmed">
            グループ{letter} の順位表と試合結果。スコア入力後に再読み込みすると順位が更新されます。
          </Text>
        </Stack>

        <div className="wc-groups-toolbar">
          <DateFilterBar />
          <FavoriteFilterToggle />
        </div>

        <div style={{ maxWidth: 760 }}>
          {showEmptyDate ? (
            <div className="wc-groups-empty-date" role="status">
              <Text c="dimmed">この日にグループ{letter}の試合はありません。</Text>
            </div>
          ) : (
            <GroupCard
              letter={letter}
              teams={teams}
              matches={filteredMatches}
              standingsMatches={matches}
            />
          )}
        </div>
      </Stack>
    </Container>
  );
}
