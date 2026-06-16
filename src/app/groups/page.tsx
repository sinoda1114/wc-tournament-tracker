import type { Metadata } from 'next';
import { Container, Group, Stack, Text, Title } from '@mantine/core';

import { DateFilterBar } from '@/components/DateFilterBar';
import { FavoriteFilterToggle } from '@/components/FavoriteFilterToggle';
import { GroupsFilterableGrid } from '@/components/GroupsFilterableGrid';
import { MatchDayList } from '@/components/MatchDayList';
import { PaywallLock } from '@/components/billing/PaywallLock';
import {
  getGroupTeams,
  listGroupStageMatches,
  listTournamentMatches,
} from '@/db/queries';
import { hasKnockoutAccess } from '@/lib/billing/access';
import { parseDatesParam, parseQuickDayParam, resolveQuickDay } from '@/lib/date-filter';
import { ogLocale } from '@/lib/i18n/alternates';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale, resolveTimeZone } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

// T-19: ロケール対応 metadata。canonical は単一URL（/groups）固定で hreflang は付けない
// （非トップページのロケール別URLは B-full スコープ外。cookie 無しのクローラには既定 ja で見える）。
export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const { title, description } = getDictionary(locale).meta.groups;
  return {
    title,
    description,
    alternates: { canonical: '/groups' },
    openGraph: { title, description, url: '/groups', locale: ogLocale(locale) },
    twitter: { title, description },
  };
}

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
  searchParams: Promise<{ date?: string | string[]; day?: string | string[] }>;
};

function pickDateParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const params = await searchParams;
  const quickDay = parseQuickDayParam(pickDateParam(params.day));
  const calendarDates = parseDatesParam(pickDateParam(params.date));
  const selectedDates =
    calendarDates.length > 0
      ? calendarDates
      : quickDay
        ? [resolveQuickDay(quickDay, await resolveTimeZone())]
        : [];
  const locale = await resolveLocale();
  const dict = getDictionary(locale);
  const isDate = selectedDates.length > 0;
  // 決勝T課金壁（T-68 面②）。日付フィルタは listTournamentMatches()（決勝T含む全試合）を
  // 返すため、ここを無料のままにすると home 側のゲートを /groups から迂回できてしまう。
  // 順位表グリッド（既定ビュー）は無料のまま、日付フィルタ操作だけを壁の内側に置く。
  const knockoutAccess = await hasKnockoutAccess();

  // 日付選択時は「その日の全試合」。未選択時は順位表グリッド（全グループ）。
  // NOTE: listTournamentMatches() は全試合（GL含む）。GL一覧と連結すると二重表示になる。
  const dayMatches = isDate && knockoutAccess ? await listTournamentMatches() : [];

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
          knockoutAccess ? (
            selectedDates.map((date) => (
              <MatchDayList key={date} matches={dayMatches} date={date} />
            ))
          ) : (
            <PaywallLock locale={locale} dict={dict} />
          )
        ) : (
          <GroupsFilterableGrid groupData={groupData} />
        )}
      </Stack>
    </Container>
  );
}
