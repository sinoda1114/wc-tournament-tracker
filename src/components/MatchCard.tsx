'use client';

import Link from 'next/link';
import { Badge, Stack, Text } from '@mantine/core';

import type { MatchDetail } from '@/db/queries';
import { useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import {
  STATUS_LABELS,
  formatKickoffJst,
  formatMatchDateJst,
} from '@/lib/bracket';

import { CountryFlag } from './CountryFlag';
import { MatchVersus } from './MatchVersus';

type MatchCardProps = {
  match: MatchDetail;
};

export function MatchCard({ match }: MatchCardProps) {
  const kickoffJst = formatKickoffJst(match.kickoffAt);
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
            {formatMatchDateJst(match)}
          </Text>
          {kickoffJst ? (
            <Text size="xs" c="dimmed" title="日本時間（JST）" component="span">
              {kickoffJst}
            </Text>
          ) : null}
          <span aria-hidden className="wc-venue-sep">
            ·
          </span>
          <span className="wc-match-card-venue-inline">
            <CountryFlag
              fifaCode={match.venue.countryCode}
              size="sm"
              ariaLabel={`${match.venue.country} 開催`}
            />
            <span aria-hidden>🏟️</span>
            <span>{match.venue.stadiumName}</span>
            <span aria-hidden className="wc-venue-sep">
              {' | '}
            </span>
            <span>
              {match.venue.state} / {match.venue.city}
            </span>
          </span>
          <Badge
            variant="light"
            size="sm"
            color={
              match.status === 'finished'
                ? 'green'
                : match.status === 'in_progress'
                  ? 'yellow'
                  : 'gray'
            }
          >
            {STATUS_LABELS[match.status]}
          </Badge>
        </div>

        <MatchVersus match={match} />
      </Stack>
    </Link>
  );
}
