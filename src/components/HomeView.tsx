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
import { parseDatesParam, parseQuickDayParam, resolveQuickDay } from '@/lib/date-filter';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale, resolveTimeZone } from '@/lib/i18n/server';
import { isFreePeriod } from '@/lib/pricing';

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

export type HomeSearchParams = {
  date?: string | string[];
  day?: string | string[];
  view?: string | string[];
};

function pickDateParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * トップページ本体（共有ビュー）。root `/`（cookie ロケール）とロケール別URL `/en` 等
 * （middleware の x-wc-locale ヘッダ）の双方から再利用する。ロケールは `resolveLocale()` で
 * 解決するため、どちらの経路でも同じ描画になる（#19 B-lite）。
 *
 * 大会フェーズに合わせて既定ビューを自動切替する（#37 フィードバック）:
 * - グループステージ期間（決勝T開始=6/29 JST より前）: グループリーグ順位表
 * - 決勝トーナメント期間: ブラケット（トーナメント表）
 * 切替は KNOCKOUT_START_UTC（lib/pricing と同一の境界）による日付ゲートで、当日の手作業は不要。
 * 未ログイン訪問者向けヒーロー（MiniHero）はどちらのフェーズでも表示する。
 */
export async function HomeView({ searchParams }: { searchParams: Promise<HomeSearchParams> }) {
  const params = await searchParams;
  // バッジ(?day=相対)とカレンダー(?date=絶対リスト)は相互排他（DateFilterBar と対）。
  const quickDay = parseQuickDayParam(pickDateParam(params.day));
  const calendarDates = parseDatesParam(pickDateParam(params.date));
  const selectedDates =
    calendarDates.length > 0
      ? calendarDates
      : quickDay
        ? [resolveQuickDay(quickDay, await resolveTimeZone())]
        : [];
  const dict = getDictionary(await resolveLocale());
  const isDate = selectedDates.length > 0;
  // 無料期間＝グループステージ期間（lib/pricing と同一境界）。PaywallBanner と同じ判定方法。
  // ?view=kt はグループステージ中でもブラケットを見るための明示指定（ナビ「決勝T」用）。
  const wantsKt = pickDateParam(params.view) === 'kt';
  const isKnockoutPhase = wantsKt || !isFreePeriod(new Date());

  // 日付選択時は「その日の全試合」一覧（フェーズ問わず共通）。
  // NOTE: listTournamentMatches() は全試合（GL含む）を返すため、GL一覧と連結しない
  //（連結すると GL の試合が二重表示になる）。
  const dayMatches = isDate ? await listTournamentMatches() : [];

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
