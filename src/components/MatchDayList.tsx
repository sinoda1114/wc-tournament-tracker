'use client';

import { Stack, Text } from '@mantine/core';

import type { MatchDetail } from '@/db/queries';
import { toZonedYmd } from '@/lib/date-filter';
import { useDictionary, useTimeZone } from '@/lib/i18n/context';

import { MatchCard } from './MatchCard';

type MatchDayListProps = {
  /** 全試合（グループリーグ＋決勝T）。この中から選択日のものを抽出する。 */
  matches: MatchDetail[];
  /** 選択された暦日 YYYY-MM-DD（観戦者TZ基準）。 */
  date: string;
};

/** 並び替えキー：kickoffAt（無ければ会場ローカル日付を末尾に寄せる）。 */
function kickoffSortKey(m: MatchDetail): string {
  return m.kickoffAt ?? `${m.matchDate}T99:99`;
}

/**
 * カレンダーで日付を選んだときに、フェーズ横断（GL＋決勝T）で「その日の全試合」を
 * 時系列カード一覧で表示する。判定は観戦者TZの暦日（toZonedYmd）で行う。
 */
export function MatchDayList({ matches, date }: MatchDayListProps) {
  const timeZone = useTimeZone();
  const dict = useDictionary();

  const dayMatches = matches
    .filter((m) => (toZonedYmd(m.kickoffAt, timeZone) ?? m.matchDate) === date)
    .sort(
      (a, b) => kickoffSortKey(a).localeCompare(kickoffSortKey(b)) || a.id - b.id,
    );

  if (dayMatches.length === 0) {
    return (
      <div className="wc-groups-empty-date" role="status">
        <Text c="dimmed">{dict.groups.emptyDate}</Text>
      </div>
    );
  }

  return (
    <Stack gap="sm">
      {dayMatches.map((m) => (
        <MatchCard key={m.id} match={m} />
      ))}
    </Stack>
  );
}
