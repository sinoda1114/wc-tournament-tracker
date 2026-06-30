'use client';

import type { MatchDetail } from '@/db/queries';
import { formatSlotLabel, formatSlotTitle, isWinner } from '@/lib/bracket';
import { useI18n } from '@/lib/i18n/context';
import { localizedTeamName } from '@/lib/i18n/team-name';

import { CountryFlag } from './CountryFlag';
import { FavoriteStar } from './FavoriteStar';

type MatchVersusProps = {
  match: MatchDetail;
  size?: 'sm' | 'md';
  showFavoriteStar?: boolean;
  /**
   * チーム名の表示形式。
   * - 'code': FIFA コード（3 文字）。幅の狭い決勝T ブラケット用の既定値。
   * - 'full': ロケール連動の正式名（試合カード用）。
   */
  nameMode?: 'code' | 'full';
};

export type MatchTeamNameMode = NonNullable<MatchVersusProps['nameMode']>;

export function MatchVersus({
  match,
  size = 'md',
  showFavoriteStar = true,
  nameMode = 'code',
}: MatchVersusProps) {
  const { locale, dict } = useI18n();
  const slotT = dict.match.slot;
  const homeName =
    nameMode === 'full' && match.homeTeam
      ? localizedTeamName(match.homeTeam, locale)
      : match.homeTeam?.fifaCode;
  const awayName =
    nameMode === 'full' && match.awayTeam
      ? localizedTeamName(match.awayTeam, locale)
      : match.awayTeam?.fifaCode;
  const homeFullName = match.homeTeam ? localizedTeamName(match.homeTeam, locale) : null;
  const awayFullName = match.awayTeam ? localizedTeamName(match.awayTeam, locale) : null;
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
            <span
              className="wc-versus-name"
              title={nameMode === 'code' ? homeFullName ?? undefined : undefined}
              aria-label={nameMode === 'code' ? homeFullName ?? undefined : undefined}
            >
              {homeName}
            </span>
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
            {match.penaltyHomeScore !== null && match.penaltyAwayScore !== null ? (
              <span className="wc-versus-penalty" aria-label={`PK ${match.penaltyHomeScore}-${match.penaltyAwayScore}`}>
                {'PK '}
                <strong className={homeWin ? 'is-winner' : ''}>{match.penaltyHomeScore}</strong>
                {'-'}
                <strong className={awayWin ? 'is-winner' : ''}>{match.penaltyAwayScore}</strong>
              </span>
            ) : null}
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
            <span
              className="wc-versus-name"
              title={nameMode === 'code' ? awayFullName ?? undefined : undefined}
              aria-label={nameMode === 'code' ? awayFullName ?? undefined : undefined}
            >
              {awayName}
            </span>
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
