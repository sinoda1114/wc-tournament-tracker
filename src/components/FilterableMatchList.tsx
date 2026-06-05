'use client';

import { Text } from '@mantine/core';

import type { MatchDetail } from '@/db/queries';
import { useFavoriteFilter, useFavoriteTeams } from '@/hooks/useFavoriteTeams';

import { MatchCard } from './MatchCard';

type FilterableMatchListProps = {
  matches: MatchDetail[];
  /** matches が空のときに表示する案内文。デフォルトは「試合データはまだありません。」 */
  emptyText?: string;
  /** 配列が空のときに何も描画したくない場合は true。 */
  hideWhenEmpty?: boolean;
};

function matchHasFavorite(match: MatchDetail, favorites: Set<string>): boolean {
  const home = match.homeTeam?.fifaCode.toUpperCase();
  const away = match.awayTeam?.fifaCode.toUpperCase();
  return (home ? favorites.has(home) : false) || (away ? favorites.has(away) : false);
}

/**
 * お気に入りフィルター対応の試合カードリスト。
 *
 * - SSR / hydrate 前 (`ready === false`) は素の全件表示。
 * - hydrate 後にフィルター ON かつお気に入り 1 件以上で絞り込み。
 */
export function FilterableMatchList({
  matches,
  emptyText = 'この条件に合致する試合はまだありません。',
  hideWhenEmpty = false,
}: FilterableMatchListProps) {
  const { filterOn, ready: filterReady } = useFavoriteFilter();
  const { favorites, ready: favReady } = useFavoriteTeams();

  const activeFilter = filterReady && favReady && filterOn && favorites.size > 0;
  const visible = activeFilter
    ? matches.filter((m) => matchHasFavorite(m, favorites))
    : matches;

  if (visible.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <Text c="dimmed" size="sm">
        {emptyText}
      </Text>
    );
  }

  return (
    <>
      {visible.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </>
  );
}
