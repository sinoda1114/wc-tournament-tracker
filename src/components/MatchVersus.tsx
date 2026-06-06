'use client';

import type { MatchDetail } from '@/db/queries';
import { formatSlotLabel, formatSlotTitle, isWinner } from '@/lib/bracket';
import { useDictionary } from '@/lib/i18n/context';

import { CountryFlag } from './CountryFlag';
import { FavoriteStar } from './FavoriteStar';

type MatchVersusProps = {
  match: MatchDetail;
  size?: 'sm' | 'md';
  showFavoriteStar?: boolean;
};

export function MatchVersus({
  match,
  size = 'md',
  showFavoriteStar = true,
}: MatchVersusProps) {
  const dict = useDictionary();
  const slotT = dict.match.slot;
  const homeWin = isWinner(match.homeTeamId, match.winnerTeamId);
  const awayWin = isWinner(match.awayTeamId, match.winnerTeamId);
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const flagSize = size === 'sm' ? 'sm' : 'md';
  const starSize = size === 'sm' ? 'sm' : 'md';

  return (
    <div className={`wc-versus wc-versus-${size}`}>
      <div className={`wc-versus-side wc-versus-home${homeWin ? ' is-winner' : ''}`}>
        {match.homeTeam ? (
          <>
            {showFavoriteStar ? (
              <FavoriteStar
                fifaCode={match.homeTeam.fifaCode}
                teamName={match.homeTeam.nameJa}
                size={starSize}
              />
            ) : null}
            <span className="wc-versus-name">{match.homeTeam.fifaCode}</span>
            <CountryFlag
              fifaCode={match.homeTeam.fifaCode}
              size={flagSize}
              ariaLabel={match.homeTeam.nameJa}
            />
          </>
        ) : (
          <span className="wc-versus-slot" title={formatSlotTitle(match.homeSlot, slotT)}>
            {formatSlotLabel(match.homeSlot, slotT)}
          </span>
        )}
      </div>
      <div className="wc-versus-score">
        {hasScore ? (
          <>
            <strong className={homeWin ? 'is-winner' : ''}>{match.homeScore}</strong>
            <span aria-hidden>-</span>
            <strong className={awayWin ? 'is-winner' : ''}>{match.awayScore}</strong>
          </>
        ) : (
          <span aria-hidden>{dict.match.versus}</span>
        )}
      </div>
      <div className={`wc-versus-side wc-versus-away${awayWin ? ' is-winner' : ''}`}>
        {match.awayTeam ? (
          <>
            <CountryFlag
              fifaCode={match.awayTeam.fifaCode}
              size={flagSize}
              ariaLabel={match.awayTeam.nameJa}
            />
            <span className="wc-versus-name">{match.awayTeam.fifaCode}</span>
            {showFavoriteStar ? (
              <FavoriteStar
                fifaCode={match.awayTeam.fifaCode}
                teamName={match.awayTeam.nameJa}
                size={starSize}
              />
            ) : null}
          </>
        ) : (
          <span className="wc-versus-slot" title={formatSlotTitle(match.awaySlot, slotT)}>
            {formatSlotLabel(match.awaySlot, slotT)}
          </span>
        )}
      </div>
    </div>
  );
}
