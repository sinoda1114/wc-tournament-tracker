'use client';

import { Stack, Text } from '@mantine/core';

import { GroupCard } from '@/components/GroupCard';
import type { MatchDetail, Team } from '@/db/queries';
import { useFavoriteFilter, useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import { useDictionary } from '@/lib/i18n/context';

export type GroupDataItem = {
  letter: string;
  teams: Team[];
  /** 表示する試合（日付フィルター適用後の可能性あり）。 */
  matches: MatchDetail[];
  /** 順位表用の試合配列。省略時は `matches` が使われる。 */
  standingsMatches?: MatchDetail[];
};

type GroupsFilterableGridProps = {
  groupData: GroupDataItem[];
};

function groupHasFavorite(item: GroupDataItem, favorites: Set<string>): boolean {
  return item.teams.some((t) => favorites.has(t.fifaCode.toUpperCase()));
}

/**
 * `/groups` 用のグリッド。お気に入りフィルターが ON のときは
 * 該当チームを含まないグループ自体を非表示にする。
 *
 * 各 GroupCard 内部の試合カードは {@link FilterableMatchList} で別途絞り込まれる。
 */
export function GroupsFilterableGrid({ groupData }: GroupsFilterableGridProps) {
  const { filterOn, ready: filterReady } = useFavoriteFilter();
  const { favorites, ready: favReady } = useFavoriteTeams();
  const t = useDictionary().groups;

  const activeFilter = filterReady && favReady && filterOn && favorites.size > 0;
  const visible = activeFilter
    ? groupData.filter((g) => groupHasFavorite(g, favorites))
    : groupData;

  if (activeFilter && visible.length === 0) {
    return (
      <Stack gap="xs" className="wc-favorite-empty">
        <Text c="dimmed">{t.favoriteEmpty}</Text>
      </Stack>
    );
  }

  return (
    <div className="wc-groups-grid">
      {visible.map((g) => (
        <GroupCard
          key={g.letter}
          letter={g.letter}
          teams={g.teams}
          matches={g.matches}
          standingsMatches={g.standingsMatches}
        />
      ))}
    </div>
  );
}
