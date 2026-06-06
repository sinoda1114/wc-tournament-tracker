'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Group, Stack, Text, Title } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { FavoriteFilterToggle } from '@/components/FavoriteFilterToggle';
import { FavoriteStar } from '@/components/FavoriteStar';
import { TeamSearchCombobox } from '@/components/TeamSearchCombobox';
import type { Team } from '@/db/queries';
import { useFavoriteFilter, useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import { groupTeamsByConfederation } from '@/lib/confederations';
import { useI18n } from '@/lib/i18n/context';
import { localizedTeamName } from '@/lib/i18n/team-name';

type TeamExplorerProps = {
  teams: Team[];
};

/** FIFA コードから選手ページの URL を作る（/teams/jpn 等、小文字）。 */
function squadHref(fifaCode: string): string {
  return `/teams/${fifaCode.toLowerCase()}`;
}

/**
 * 「出場国」一覧＋検索セクション（/teams）。
 *
 * - 検索コンボボックス（/favorites のピッカーと同じ matchesTeamQuery を流用）。
 *   候補にはお気に入り登録済みを「✓ 登録済」で明示する。選択で選手ページへ遷移。
 * - グリッドは大陸（FIFA連盟）別セクション。各国は日本語名の五十音順。
 * - 国を選ぶと専用ページ `/teams/[code]` へ遷移する（ブラウザバックで一覧に戻れる）。
 */
export function TeamExplorer({ teams }: TeamExplorerProps) {
  const router = useRouter();
  const { locale, dict } = useI18n();
  const { isFavorite, ready } = useFavoriteTeams();
  const { filterOn, ready: filterReady } = useFavoriteFilter();

  // グリッドは大陸（FIFA連盟）別セクションに分けて表示する。
  const confederationGroups = useMemo(
    () => groupTeamsByConfederation(teams),
    [teams],
  );

  // 「☆のみを表示」ON のときは各セクションをお気に入り国だけに絞り、空セクションは隠す。
  const showFavOnly = ready && filterReady && filterOn;
  const visibleGroups = useMemo(() => {
    if (!showFavOnly) return confederationGroups;
    return confederationGroups
      .map((g) => ({ ...g, teams: g.teams.filter((t) => isFavorite(t.fifaCode)) }))
      .filter((g) => g.teams.length > 0);
  }, [confederationGroups, showFavOnly, isFavorite]);

  return (
    <section className="wc-team-explorer">
      <Stack gap="sm">
        <Stack gap={4}>
          <Group align="center" wrap="wrap" gap="sm">
            <Title order={2}>
              {dict.teams.heading.replace('{count}', String(teams.length))}
            </Title>
            <FavoriteFilterToggle showHintWhenEmpty={false} />
          </Group>
          <Text c="dimmed" size="sm">
            {dict.teams.description}
          </Text>
        </Stack>

        <TeamSearchCombobox
          className="wc-team-explorer-search"
          teams={teams}
          ariaLabel={dict.teams.searchAria}
          placeholder={dict.teams.searchPlaceholder}
          onSelect={(t) => router.push(squadHref(t.fifaCode))}
          optionAdornment={(t) =>
            ready && isFavorite(t.fifaCode) ? (
              <span
                className="wc-team-option-fav"
                role="img"
                aria-label={dict.teams.favoriteRegistered}
                title={dict.teams.favoriteRegistered}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  aria-hidden
                  focusable={false}
                >
                  <path d="M12 2.5l2.92 6.51 7.08.62-5.34 4.73 1.62 7.04L12 17.77l-6.28 3.63 1.62-7.04L2 9.63l7.08-.62L12 2.5z" />
                </svg>
              </span>
            ) : null
          }
        />

        <div className="wc-team-conf-groups">
          {showFavOnly && visibleGroups.length === 0 ? (
            <Text c="dimmed" size="sm">
              {dict.teams.favoriteEmpty}
            </Text>
          ) : null}
          {visibleGroups.map((group) => (
            <section
              key={group.key}
              className="wc-team-conf-section"
              aria-label={dict.confederations[group.key]}
            >
              <h3 className="wc-team-conf-title">
                <span>{dict.confederations[group.key]}</span>
                <span className="wc-team-conf-count">{group.teams.length}</span>
              </h3>
              <ul className="wc-team-grid">
                {group.teams.map((t) => (
                  <li key={t.id} className="wc-team-chip">
                    <Link
                      href={squadHref(t.fifaCode)}
                      className="wc-team-chip-main"
                    >
                      <CountryFlag fifaCode={t.fifaCode} size="sm" ariaLabel={t.nameJa} />
                      <span className="wc-team-chip-name">{localizedTeamName(t, locale)}</span>
                      <span className="wc-team-chip-code">{t.fifaCode}</span>
                    </Link>
                    <FavoriteStar fifaCode={t.fifaCode} teamName={t.nameJa} size="sm" />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Stack>
    </section>
  );
}
