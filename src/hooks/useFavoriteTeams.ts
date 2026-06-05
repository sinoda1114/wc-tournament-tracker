'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  FAVORITES_CHANGED_EVENT,
  FAVORITES_KEY,
  FILTER_KEY,
  readFavorites,
  readFilterEnabled,
  toggleFavorite as toggleFavoriteStorage,
  writeFavorites,
  writeFilterEnabled,
} from '@/lib/favorites';

function toSet(list: readonly string[]): Set<string> {
  return new Set(list);
}

/**
 * お気に入りチーム集合をクライアント側で扱う Hook。
 *
 * - SSR 初回は空集合で hydrate される（DOM 側がサーバー描画と一致するように）。
 * - `useEffect` で localStorage から読み込み、`storage` イベント（他タブ）と
 *   `wc:favorites-changed` イベント（同タブ）を購読して状態を最新に保つ。
 */
export function useFavoriteTeams(): {
  favorites: Set<string>;
  toggle: (code: string) => void;
  isFavorite: (code: string) => boolean;
  clear: () => void;
  /** hydrate 済みかどうか。SSR と同じ描画にするため初回 false。 */
  ready: boolean;
} {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFavorites(toSet(readFavorites()));
    setReady(true);

    const refresh = () => setFavorites(toSet(readFavorites()));

    const onStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_KEY || event.key === null) {
        refresh();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(FAVORITES_CHANGED_EVENT, refresh);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, refresh);
    };
  }, []);

  const toggle = useCallback((code: string) => {
    const next = toggleFavoriteStorage(code);
    setFavorites(toSet(next));
  }, []);

  const isFavorite = useCallback(
    (code: string) => favorites.has(code.toUpperCase()),
    [favorites],
  );

  const clear = useCallback(() => {
    writeFavorites([]);
    setFavorites(new Set());
  }, []);

  return { favorites, toggle, isFavorite, clear, ready };
}

/**
 * フィルター（お気に入りのみ表示）のトグル状態を扱う Hook。
 *
 * - SSR 初回は false（全試合表示）で hydrate される。
 * - `useEffect` で localStorage を読み込み、トグル状態を反映する。
 */
export function useFavoriteFilter(): {
  filterOn: boolean;
  setFilterOn: (on: boolean) => void;
  ready: boolean;
} {
  const [filterOn, setFilterOnState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFilterOnState(readFilterEnabled());
    setReady(true);

    const refresh = () => setFilterOnState(readFilterEnabled());

    const onStorage = (event: StorageEvent) => {
      if (event.key === FILTER_KEY || event.key === null) {
        refresh();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(FAVORITES_CHANGED_EVENT, refresh);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, refresh);
    };
  }, []);

  const setFilterOn = useCallback((on: boolean) => {
    writeFilterEnabled(on);
    setFilterOnState(on);
  }, []);

  return { filterOn, setFilterOn, ready };
}
