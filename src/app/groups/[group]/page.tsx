import type { Metadata } from 'next';
import { AnchorLink } from '@/components/RouterLink';
import { notFound } from 'next/navigation';
import { Container, Stack, Text, Title } from '@mantine/core';

import { DateFilterBar } from '@/components/DateFilterBar';
import { FavoriteFilterToggle } from '@/components/FavoriteFilterToggle';
import { GroupCard } from '@/components/GroupCard';
import { getGroupTeams, listGroupMatches } from '@/db/queries';
import { filterMatchesByDates, parseDatesParam } from '@/lib/date-filter';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { group } = await params;
  const lower = group.toLowerCase();
  if (!VALID_GROUPS.has(lower)) {
    return { title: 'グループリーグ' };
  }
  const letter = lower.toUpperCase();
  const title = `グループ${letter}`;
  const description = `WC 2026 グループ${letter}の順位表と試合結果。出場国と日程をまとめています。`;

  return {
    title,
    description,
    alternates: { canonical: `/groups/${lower}` },
    openGraph: { title, description, url: `/groups/${lower}` },
  };
}

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

  const selectedDates = parseDatesParam(pickDateParam(sp.date));

  const [teams, matches] = await Promise.all([
    getGroupTeams(letter),
    listGroupMatches(letter),
  ]);

  const filteredMatches = filterMatchesByDates(matches, selectedDates);
  const showEmptyDate = selectedDates.length > 0 && filteredMatches.length === 0;

  const dict = getDictionary(await resolveLocale());
  const heading = dict.groups.groupHeading.replace('{letter}', letter);

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <AnchorLink href="/groups" c="dimmed" size="sm">
            {dict.groups.backToList}
          </AnchorLink>
          <Title order={1}>{heading}</Title>
          <Text c="dimmed">{dict.groups.detailDescription.replace('{letter}', letter)}</Text>
        </Stack>

        <div className="wc-groups-toolbar">
          <DateFilterBar />
          <FavoriteFilterToggle />
        </div>

        <div style={{ maxWidth: 760 }}>
          {showEmptyDate ? (
            <div className="wc-groups-empty-date" role="status">
              <Text c="dimmed">{dict.groups.detailEmptyDate.replace('{letter}', letter)}</Text>
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
