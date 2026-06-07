'use client';

import Link from 'next/link';
import { Badge, Stack, Text } from '@mantine/core';

import type { MatchDetail } from '@/db/queries';
import { useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import { formatKickoff, formatMatchDateZoned } from '@/lib/bracket';
import { useDictionary, useTimeZone } from '@/lib/i18n/context';

import { MatchVersus } from './MatchVersus';

type MatchCardProps = {
  match: MatchDetail;
};

export function MatchCard({ match }: MatchCardProps) {
  const dict = useDictionary();
  const timeZone = useTimeZone();
  const kickoff = formatKickoff(match.kickoffAt, timeZone);
  const { isFavorite, ready } = useFavoriteTeams();

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
        </div>

        <MatchVersus match={match} nameMode="full" />
      </Stack>
    </Link>
  );
}
