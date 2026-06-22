'use client';

import { useMemo } from 'react';
import { Stack, Text, Title } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { FavoriteFilterToggle } from '@/components/FavoriteFilterToggle';
import { FavoriteTeamPicker } from '@/components/FavoriteTeamPicker';
import { MatchCard } from '@/components/MatchCard';
import type { MatchDetail, Team } from '@/db/queries';
import { useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import { useI18n } from '@/lib/i18n/context';
import { localizedTeamName } from '@/lib/i18n/team-name';

type FavoritesPageViewProps = {
  /** サーバー側で英語名アルファベット順に整列済みの全チーム。 */
  teams: Team[];
  matches: MatchDetail[];
};

function matchSortKey(m: MatchDetail): string {
  // 試合日 + キックオフ ISO 文字列で時系列ソート（kickoff が無ければ末尾扱い）。
  return `${m.matchDate}T${m.kickoffAt ?? '99:99:99Z'}:${m.id.toString().padStart(4, '0')}`;
}

function matchHasFavorite(m: MatchDetail, favorites: Set<string>): boolean {
  const home = m.homeTeam?.fifaCode.toUpperCase();
  const away = m.awayTeam?.fifaCode.toUpperCase();
  return (home ? favorites.has(home) : false) || (away ? favorites.has(away) : false);
}

export function FavoritesPageView({ teams, matches }: FavoritesPageViewProps) {
  const { locale, dict } = useI18n();
  const t = dict.favorites;
  const { favorites, isFavorite, toggle, ready } = useFavoriteTeams();

  // 入力 `teams` は既に英語名アルファベット順に整列済みなので、
  // お気に入りに含まれるものだけフィルタすればそのまま表示順として使える。
  const favoriteTeams = useMemo(() => {
    if (!ready) return [];
    return teams.filter((t) => isFavorite(t.fifaCode));
  }, [teams, isFavorite, ready]);

  const favoriteMatches = useMemo(() => {
    if (!ready || favorites.size === 0) return [];
    return matches
      .filter((m) => matchHasFavorite(m, favorites))
      .sort((a, b) => matchSortKey(a).localeCompare(matchSortKey(b)));
  }, [matches, favorites, ready]);

  return (
    <Stack gap="xl">
      <section>
        <Stack gap="sm" mb="sm">
          <Title order={2}>{t.selectTeamTitle}</Title>
          <Text c="dimmed" size="sm">
            {t.selectTeamDescription}
          </Text>
        </Stack>

        <FavoriteTeamPicker teams={teams} />

        <Stack gap="xs" mt="md">
          <Text size="sm" c="dimmed">
            {t.currentCount.replace('{count}', String(ready ? favoriteTeams.length : 0))}
          </Text>
          {!ready ? (
            <Text c="dimmed" size="sm">
              {t.loading}
            </Text>
          ) : favoriteTeams.length === 0 ? (
            <Text c="dimmed" size="sm">
              {t.emptyPicker}
            </Text>
          ) : (
            <ul className="wc-favorite-list" aria-label={t.listAria}>
              {favoriteTeams.map((team) => {
                const name = localizedTeamName(team, locale);
                const removeLabel = t.removeAria.replace('{name}', name);
                return (
                  <li key={team.id} className="wc-favorite-list-item">
                    <CountryFlag fifaCode={team.fifaCode} size="sm" ariaLabel={name} />
                    <span className="wc-favorite-list-code">{team.fifaCode}</span>
                    <button
                      type="button"
                      className="wc-remove"
                      onClick={() => toggle(team.fifaCode)}
                      aria-label={removeLabel}
                      title={removeLabel}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Stack>
      </section>

      <section>
        <Stack gap="sm" mb="sm">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <Title order={2}>{t.matchesTitle}</Title>
            <FavoriteFilterToggle showHintWhenEmpty={false} />
          </div>
          <Text c="dimmed" size="sm">
            {t.matchesDescription}
          </Text>
        </Stack>

        {!ready ? (
          <Text c="dimmed" size="sm">
            {t.loading}
          </Text>
        ) : favorites.size === 0 ? (
          <div className="wc-favorite-empty">
            <Text c="dimmed">
              {t.emptyMatches}
            </Text>
          </div>
        ) : favoriteMatches.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t.noMatches}
          </Text>
        ) : (
          <div className="wc-favorites-match-list">
            {favoriteMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>
    </Stack>
  );
}
