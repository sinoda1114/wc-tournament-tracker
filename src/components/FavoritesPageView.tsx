'use client';

import { useMemo } from 'react';
import { Stack, Text, Title } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { FavoriteFilterToggle } from '@/components/FavoriteFilterToggle';
import { FavoriteTeamPicker } from '@/components/FavoriteTeamPicker';
import { MatchCard } from '@/components/MatchCard';
import type { MatchDetail, Team } from '@/db/queries';
import { useFavoriteTeams } from '@/hooks/useFavoriteTeams';

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
          <Title order={2}>チームを選択</Title>
          <Text c="dimmed" size="sm">
            日本語名・英語名・FIFA 3文字コード（例: 日本 / Japan / JPN）で検索できます。
            選択するとお気に入りに登録され、試合カードに金色の枠が付きます。
          </Text>
        </Stack>

        <FavoriteTeamPicker teams={teams} />

        <Stack gap="xs" mt="md">
          <Text size="sm" c="dimmed">
            現在のお気に入り（{ready ? favoriteTeams.length : 0} 件）
          </Text>
          {!ready ? (
            <Text c="dimmed" size="sm">
              読み込み中…
            </Text>
          ) : favoriteTeams.length === 0 ? (
            <Text c="dimmed" size="sm">
              上の検索で気になる国を選んでください。
            </Text>
          ) : (
            <ul className="wc-favorite-list" aria-label="お気に入りチーム一覧">
              {favoriteTeams.map((t) => (
                <li key={t.id} className="wc-favorite-list-item">
                  <CountryFlag fifaCode={t.fifaCode} size="sm" ariaLabel={t.nameJa} />
                  <span className="wc-favorite-list-name">{t.nameJa}</span>
                  <span className="wc-favorite-list-code">{t.fifaCode}</span>
                  <button
                    type="button"
                    className="wc-remove"
                    onClick={() => toggle(t.fifaCode)}
                    aria-label={`${t.nameJa} をお気に入りから削除`}
                    title={`${t.nameJa} をお気に入りから削除`}
                  >
                    ✕
                  </button>
                </li>
              ))}
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
            <Title order={2}>お気に入りチームの試合</Title>
            <FavoriteFilterToggle showHintWhenEmpty={false} />
          </div>
          <Text c="dimmed" size="sm">
            お気に入りに登録したチームが関わる試合を時系列で表示します。
          </Text>
        </Stack>

        {!ready ? (
          <Text c="dimmed" size="sm">
            読み込み中…
          </Text>
        ) : favorites.size === 0 ? (
          <div className="wc-favorite-empty">
            <Text c="dimmed">
              まだお気に入りのチームがありません。上の検索から気になる国を選んでください。
            </Text>
          </div>
        ) : favoriteMatches.length === 0 ? (
          <Text c="dimmed" size="sm">
            該当する試合はありません。
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
