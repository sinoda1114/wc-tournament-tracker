'use client';

import { Stack, Text } from '@mantine/core';

import type { MatchDetail } from '@/db/queries';
import { useFavoriteFilter, useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import { toZonedYmd } from '@/lib/date-filter';
import { matchHasFavorite } from '@/lib/favorites';
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
 *
 * お気に入りフィルター（☆のみを表示）が ON かつお気に入り 1 件以上のときは、
 * その日の試合をさらに「お気に入りチームを含む試合」だけに絞り込む。
 * hydrate 前（ready=false）は素の全件表示にして SSR と一致させる。
 */
export function MatchDayList({ matches, date }: MatchDayListProps) {
  const timeZone = useTimeZone();
  const dict = useDictionary();
  const { filterOn, ready: filterReady } = useFavoriteFilter();
  const { favorites, ready: favReady } = useFavoriteTeams();

  const dayMatches = matches
    .filter((m) => (toZonedYmd(m.kickoffAt, timeZone) ?? m.matchDate) === date)
    .sort(
      (a, b) => kickoffSortKey(a).localeCompare(kickoffSortKey(b)) || a.id - b.id,
    );

  // そもそもこの日に試合が無い。
  if (dayMatches.length === 0) {
    return (
      <div className="wc-groups-empty-date" role="status">
        <Text c="dimmed">{dict.groups.emptyDate}</Text>
      </div>
    );
  }

  const activeFilter = filterReady && favReady && filterOn && favorites.size > 0;
  const visible = activeFilter
    ? dayMatches.filter((m) => matchHasFavorite(m, favorites))
    : dayMatches;

  // 試合はあるが、お気に入りフィルターに合致する試合がこの日には無い。
  if (visible.length === 0) {
    return (
      <div className="wc-groups-empty-date" role="status">
        <Text c="dimmed">{dict.standings.noMatchesFilter}</Text>
      </div>
    );
  }

  return (
    <Stack gap="sm">
      {visible.map((m) => (
        <MatchCard key={m.id} match={m} />
      ))}
    </Stack>
  );
}
