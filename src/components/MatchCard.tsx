'use client';

import Link from 'next/link';
import { Badge, Stack, Text } from '@mantine/core';

import type { MatchDetail } from '@/db/queries';
import { useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import { formatKickoff, formatMatchDateZoned, type MatchStage } from '@/lib/bracket';
import { useDictionary, useTimeZone } from '@/lib/i18n/context';
import { deriveMatchDataState } from '@/lib/match-data-state';

import { MatchDataBadge } from './MatchDataBadge';
import { MatchVersus } from './MatchVersus';

type MatchCardProps = {
  match: MatchDetail;
  /**
   * グループ／ステージのコンテキストラベル（例: グループD・ラウンド32）を表示するか。
   * デフォルトは true（フラット表示や日付フィルタなどグループ混在の文脈では必要）。
   * グループ別ビューのように見出しで所属が自明な場合のみ false を渡して冗長表示を抑止する。
   */
  showContextLabel?: boolean;
};

export function MatchCard({ match, showContextLabel = true }: MatchCardProps) {
  const dict = useDictionary();
  const timeZone = useTimeZone();
  const kickoff = formatKickoff(match.kickoffAt, timeZone);
  const { isFavorite, ready } = useFavoriteTeams();

  // 試合の所属を示すラベル。グループリーグはグループ名（例: グループD）、
  // 決勝T はステージ名（例: ラウンド32）。文言は試合詳細ページと統一する。
  const groupOrStageLabel =
    match.stage === 'group_stage' && match.groupLetter
      ? dict.groups.groupHeading.replace('{letter}', match.groupLetter)
      : dict.match.stage[match.stage as MatchStage] ?? match.stage;

  // データの正直さ（T-82④）: 一覧カードはイベント件数を持たないため pending（未取込/確認中）のみ判定。
  const dataState = deriveMatchDataState({
    status: match.status,
    stage: match.stage,
    kickoffAt: match.kickoffAt,
    matchDate: match.matchDate,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  });

  const homeFav = ready && match.homeTeam ? isFavorite(match.homeTeam.fifaCode) : false;
  const awayFav = ready && match.awayTeam ? isFavorite(match.awayTeam.fifaCode) : false;
  const hasFavorite = homeFav || awayFav;

  return (
    <Link
      href={`/matches/${match.id}`}
      className={`wc-match-card${hasFavorite ? ' is-favorite-team' : ''}`}
    >
      <Stack gap="sm" p="md">
        <div className="wc-match-card-header">
          <Text size="xs" c="dimmed" fw={600} component="span">
            #{match.id}
          </Text>
          {showContextLabel && groupOrStageLabel ? (
            <Badge
              variant="light"
              color="gray"
              size="sm"
              className="wc-match-card-group"
            >
              {groupOrStageLabel}
            </Badge>
          ) : null}
          <Text size="sm" c="dimmed" component="span">
            {formatMatchDateZoned(match, timeZone, dict.match.weekdays)}
          </Text>
          {kickoff ? (
            <Text size="xs" c="dimmed" title={timeZone} component="span">
              {kickoff}
            </Text>
          ) : null}
          <span aria-hidden className="wc-venue-sep">
            ·
          </span>
          <span className="wc-match-card-venue-inline">
            <span aria-hidden>🏟️</span>
            <span>{match.venue.stadiumName}</span>
            <span aria-hidden className="wc-venue-sep">
              {' | '}
            </span>
            <span>
              {match.venue.state} / {match.venue.city}
            </span>
          </span>
          {/* 「予定(scheduled)」はバッジを出さない。終了/試合中のみ表示する。 */}
          {match.status === 'finished' || match.status === 'in_progress' ? (
            <Badge
              variant="light"
              size="sm"
              color={match.status === 'finished' ? 'green' : 'yellow'}
            >
              {dict.match.status[match.status]}
            </Badge>
          ) : null}
          {/* データの正直さ（T-82④）: 未取込/確認中を確定値と区別して明示。 */}
          <MatchDataBadge state={dataState} />
        </div>

        <MatchVersus match={match} nameMode="full" />
      </Stack>
    </Link>
  );
}
