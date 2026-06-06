'use client';

import type { MatchDetail } from '@/db/queries';
import { useFavoriteFilter, useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import { groupMatchesByStage } from '@/lib/bracket';
import { useDictionary } from '@/lib/i18n/context';

import { MatchCard } from './MatchCard';

type TournamentBracketProps = {
  matches: MatchDetail[];
};

function matchHasFavorite(match: MatchDetail, favorites: Set<string>): boolean {
  const home = match.homeTeam?.fifaCode.toUpperCase();
  const away = match.awayTeam?.fifaCode.toUpperCase();
  return (home ? favorites.has(home) : false) || (away ? favorites.has(away) : false);
}

export function TournamentBracket({ matches }: TournamentBracketProps) {
  const { filterOn, ready: filterReady } = useFavoriteFilter();
  const { favorites, ready: favReady } = useFavoriteTeams();
  const dict = useDictionary();

  const activeFilter = filterReady && favReady && filterOn && favorites.size > 0;
  const visibleMatches = activeFilter
    ? matches.filter((m) => matchHasFavorite(m, favorites))
    : matches;
  const columns = groupMatchesByStage(visibleMatches);

  return (
    <div className="wc-bracket-scroll">
      <div className="wc-bracket-grid">
        {columns.map((column) => (
          <section key={column.stage} className="wc-stage-column">
            <h2 className="wc-stage-title">{dict.match.stage[column.stage]}</h2>
            {column.matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
