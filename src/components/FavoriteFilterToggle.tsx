'use client';

import { useFavoriteFilter, useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import { useDictionary } from '@/lib/i18n/context';

type FavoriteFilterToggleProps = {
  /** 0 件のときの控えめなヒント文を表示するかどうか。 */
  showHintWhenEmpty?: boolean;
};

/**
 * 「お気に入りのみ表示」トグル。
 *
 * - SSR / hydrate 前は OFF として描画される（DOM 不一致を避ける）。
 * - hydrate 後に localStorage の状態を反映する。
 */
export function FavoriteFilterToggle({ showHintWhenEmpty = true }: FavoriteFilterToggleProps) {
  const { filterOn, setFilterOn, ready } = useFavoriteFilter();
  const { favorites, ready: favReady } = useFavoriteTeams();
  const t = useDictionary().favoriteFilter;

  const hasFavorites = favReady && favorites.size > 0;
  const isOn = ready && filterOn;

  return (
    <div className="wc-favorite-filter-toggle" role="group" aria-label={t.groupLabel}>
      <button
        type="button"
        className={`wc-favorite-filter-button${isOn ? ' is-on' : ''}`}
        onClick={() => setFilterOn(!isOn)}
        aria-pressed={isOn}
        aria-label={t.onlyStarredAria}
        disabled={!ready}
      >
        <span>{t.onlyStarred}</span>
        {favReady && favorites.size > 0 ? (
          <span
            className="wc-favorite-filter-count"
            aria-label={`${favorites.size} ${t.teamsUnit}`}
          >
            {favorites.size}
          </span>
        ) : null}
      </button>
      {showHintWhenEmpty && favReady && !hasFavorites ? (
        <span className="wc-favorite-filter-hint">{t.hint}</span>
      ) : null}
    </div>
  );
}
