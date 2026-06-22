'use client';

import Link from 'next/link';

import type { MatchDetail } from '@/db/queries';
import { useFavoriteFilter, useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import { formatKickoff, formatMatchDateZoned, type MatchStage } from '@/lib/bracket';
import { useDictionary, useTimeZone } from '@/lib/i18n/context';

import { CountryFlag } from './CountryFlag';
import { MatchVersus } from './MatchVersus';

type BracketMiniCardProps = {
  match: MatchDetail;
  emphasized?: boolean;
};

export function BracketMiniCard({ match, emphasized = false }: BracketMiniCardProps) {
  const dict = useDictionary();
  const timeZone = useTimeZone();
  const stageLabel = dict.match.stage[match.stage as MatchStage] ?? match.stage;
  const kickoff = formatKickoff(match.kickoffAt, timeZone);
  const { favorites, isFavorite, ready } = useFavoriteTeams();
  const { filterOn, ready: filterReady } = useFavoriteFilter();

  const homeFav = ready && match.homeTeam ? isFavorite(match.homeTeam.fifaCode) : false;
  const awayFav = ready && match.awayTeam ? isFavorite(match.awayTeam.fifaCode) : false;
  const hasFavorite = homeFav || awayFav;
  const activeFilter = ready && filterReady && filterOn && favorites.size > 0;
  // ペア構造を崩さないため、ブラケットビューでは非対象試合を非表示にせず透明度で控えめにする。
  const dimmed = activeFilter && !hasFavorite;

  const classes = [
    'wc-mini-card',
    emphasized ? 'wc-bracket-final' : '',
    hasFavorite ? 'is-favorite-team' : '',
    dimmed ? 'wc-bracket-dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link href={`/matches/${match.id}`} className={classes}>
      <span
        className="wc-mini-card-venue-badge"
        title={dict.match.venueTitle
          .replace('{country}', match.venue.country)
          .replace('{stadium}', match.venue.stadiumName)}
      >
        <CountryFlag
          fifaCode={match.venue.countryCode}
          size="sm"
          ariaLabel={dict.match.venueAria.replace('{country}', match.venue.country)}
        />
      </span>
      <div className="wc-mini-card-header">
        <span className="wc-mini-card-id">#{match.id}</span>
        <span className="wc-mini-card-datetime">
          <span>{formatMatchDateZoned(match, timeZone, dict.match.weekdays)}</span>
          {kickoff ? (
            <span className="wc-mini-card-kickoff" title={timeZone}>
              {kickoff}
            </span>
          ) : null}
        </span>
      </div>
      <MatchVersus
        match={match}
        size="sm"
        showFavoriteStar={false}
        nameMode="code"
      />
      {emphasized ? (
        <div style={{ textAlign: 'center', color: 'var(--wc-gold)', fontSize: '0.72rem' }}>
          {stageLabel}
        </div>
      ) : null}
    </Link>
  );
}
