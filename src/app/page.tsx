import { Container, Group, Stack, Text, Title } from '@mantine/core';

import { DateFilterBar } from '@/components/DateFilterBar';
import { FavoriteFilterToggle } from '@/components/FavoriteFilterToggle';
import { GroupsFilterableGrid } from '@/components/GroupsFilterableGrid';
import { MatchDayList } from '@/components/MatchDayList';
import { MiniHero } from '@/components/MiniHero';
import { TournamentViewToggle } from '@/components/TournamentViewToggle';
import {
  getGroupTeams,
  listGroupStageMatches,
  listTournamentMatches,
} from '@/db/queries';
import { parseDatesParam } from '@/lib/date-filter';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';
import { isFreePeriod } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

type HomePageProps = {
  searchParams: Promise<{ date?: string | string[]; view?: string | string[] }>;
};

function pickDateParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * トップページ。大会フェーズに合わせて既定ビューを自動切替する（#37 フィードバック）:
 * - グループステージ期間（決勝T開始=6/28 JST より前）: グループリーグ順位表
 * - 決勝トーナメント期間: ブラケット（トーナメント表）
 * 切替は KNOCKOUT_START_UTC（lib/pricing と同一の境界）による日付ゲートで、当日の手作業は不要。
 * 未ログイン訪問者向けヒーロー（MiniHero）はどちらのフェーズでも表示する。
 */
export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const selectedDates = parseDatesParam(pickDateParam(params.date));
  const dict = getDictionary(await resolveLocale());
  const isDate = selectedDates.length > 0;
  // 無料期間＝グループステージ期間（lib/pricing と同一境界）。PaywallBanner と同じ判定方法。
  // ?view=kt はグループステージ中でもブラケットを見るための明示指定（ナビ「決勝T」用）。
  const wantsKt = pickDateParam(params.view) === 'kt';
  const isKnockoutPhase = wantsKt || !isFreePeriod(new Date());

  // 日付選択時は GL＋決勝T 横断の「その日の全試合」一覧（フェーズ問わず共通）。
  const dayMatches = isDate
    ? [...(await listGroupStageMatches()), ...(await listTournamentMatches())]
    : [];

  // 未選択時: フェーズに応じた既定ビューのデータだけ取得する。
  const knockoutMatches = !isDate && isKnockoutPhase ? await listTournamentMatches() : [];
  const allGroupMatches = !isDate && !isKnockoutPhase ? await listGroupStageMatches() : [];
  const groupData =
    !isDate && !isKnockoutPhase
      ? await Promise.all(
          GROUP_LETTERS.map(async (letter) => {
            const teams = await getGroupTeams(letter);
            const matches = allGroupMatches.filter((m) => m.groupLetter === letter);
            return { letter, teams, matches, standingsMatches: matches };
          }),
        )
      : [];

  const heading = isKnockoutPhase ? dict.home : dict.groups;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <MiniHero dict={dict} />
        <Stack gap={4}>
          <Group align="center" wrap="wrap" gap="sm">
            <Title order={1}>{heading.title}</Title>
            <FavoriteFilterToggle showHintWhenEmpty={false} />
          </Group>
          <Text c="dimmed">{heading.description}</Text>
        </Stack>

        <div className="wc-groups-toolbar">
          <DateFilterBar />
        </div>

        {isDate ? (
          selectedDates.map((date) => (
            <MatchDayList key={date} matches={dayMatches} date={date} />
          ))
        ) : isKnockoutPhase ? (
          <TournamentViewToggle matches={knockoutMatches} />
        ) : (
          <GroupsFilterableGrid groupData={groupData} />
        )}
      </Stack>
    </Container>
  );
}
