'use client';

import { useMemo } from 'react';
import { Stack, Text } from '@mantine/core';

import { GroupCard } from '@/components/GroupCard';
import type { MatchDetail, Team } from '@/db/queries';
import { useFavoriteFilter, useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import { clinchGroupQualification } from '@/lib/clinch';
import { useDictionary } from '@/lib/i18n/context';
import {
  resolveThirdPlaceQualification,
  type GroupStandingsEntry,
} from '@/lib/round-of-32';
import { calculateGroupStandings } from '@/lib/standings';
import type { GroupLetter } from '@/lib/third-place';

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

  // #33: 全12組の順位から「グループステージ確定」と「各組3位の決勝T進出」を算出。
  // お気に入りフィルターで一部が非表示でも、確定判定は必ず全組（groupData）で行う。
  const thirdPlaceQualified = useMemo(() => {
    const entries: GroupStandingsEntry[] = groupData.map((g) => ({
      group: g.letter as GroupLetter,
      standings: calculateGroupStandings(g.teams, g.standingsMatches ?? g.matches),
    }));
    return resolveThirdPlaceQualification(entries);
  }, [groupData]);

  // 確定 = 3位判定が null でない（全組消化済み）こと。3位通過枠の着色のみこれをゲートにする。
  const confirmed = [...thirdPlaceQualified.values()].some((v) => v !== null);

  // T-105: 1-2位の突破が「数学的に確定（クリンチ）」したチームの id 集合。
  // グループ完了を待たず、確定した瞬間に緑になる（全組消化を待つ confirmed とは別系統）。
  const clinchedTeamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const g of groupData) {
      const clinch = clinchGroupQualification(g.teams, g.standingsMatches ?? g.matches);
      for (const [teamId, c] of clinch) if (c.clinchedTop2) ids.add(teamId);
    }
    return ids;
  }, [groupData]);

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
          confirmed={confirmed}
          thirdPlaceQualified={thirdPlaceQualified.get(g.letter as GroupLetter) === true}
          clinchedTeamIds={clinchedTeamIds}
        />
      ))}
    </div>
  );
}
