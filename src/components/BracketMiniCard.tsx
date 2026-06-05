'use client';

import Link from 'next/link';

import type { MatchDetail } from '@/db/queries';
import { useFavoriteFilter, useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import {
  STAGE_LABELS,
  formatKickoffJst,
  formatMatchDateJst,
  type MatchStage,
} from '@/lib/bracket';

import { CountryFlag } from './CountryFlag';
import { MatchVersus } from './MatchVersus';

type BracketMiniCardProps = {
  match: MatchDetail;
  emphasized?: boolean;
};

export function BracketMiniCard({ match, emphasized = false }: BracketMiniCardProps) {
  const stageLabel = STAGE_LABELS[match.stage as MatchStage] ?? match.stage;
  const kickoffJst = formatKickoffJst(match.kickoffAt);
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
        title={`会場: ${match.venue.country} / ${match.venue.stadiumName}`}
      >
        <CountryFlag
          fifaCode={match.venue.countryCode}
          size="sm"
          ariaLabel={`会場 ${match.venue.country}`}
        />
      </span>
      <div className="wc-mini-card-header">
        <span className="wc-mini-card-id">#{match.id}</span>
        <span className="wc-mini-card-datetime">
          <span>{formatMatchDateJst(match)}</span>
          {kickoffJst ? (
            <span className="wc-mini-card-kickoff" title="日本時間（JST）">
              {kickoffJst}
            </span>
          ) : null}
        </span>
      </div>
      <MatchVersus match={match} size="sm" showFavoriteStar={false} />
      {emphasized ? (
        <div style={{ textAlign: 'center', color: 'var(--wc-gold)', fontSize: '0.72rem' }}>
          {stageLabel}
        </div>
      ) : null}
    </Link>
  );
}
