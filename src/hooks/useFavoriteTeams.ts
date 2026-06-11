'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';

import { saveFavoritesAction, syncFavoritesAction } from '@/app/favorites/actions';
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
 * - localStorage を即時キャッシュとして使い、`storage`（他タブ）/`wc:favorites-changed`
 *   （同タブ）イベントで最新に保つ。
 * - **ログイン中はサーバ（user_favorites）と同期**して端末間で一致させる:
 *   初回マウントで localStorage 分とサーバ分をマージ→両方へ反映。トグル時は localStorage を
 *   即時更新（楽観的UI）し、全件をサーバへ保存する（失敗は握りつぶしてローカルは維持）。
 */
export function useFavoriteTeams(): {
  favorites: Set<string>;
  toggle: (code: string) => void;
  isFavorite: (code: string) => boolean;
  clear: () => void;
  /** hydrate 済みかどうか。SSR と同じ描画にするため初回 false。 */
  ready: boolean;
} {
  const { isSignedIn } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);
  // 同一ログインセッションで初回同期を一度だけ走らせるためのフラグ。
  const syncedRef = useRef(false);

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

  // ログイン状態が確定したらサーバとマージ同期する（ログアウトでフラグを戻す）。
  useEffect(() => {
    if (!isSignedIn) {
      syncedRef.current = false;
      return;
    }
    if (syncedRef.current) return;
    syncedRef.current = true;

    let cancelled = false;
    void syncFavoritesAction(readFavorites()).then(({ codes }) => {
      if (cancelled) return;
      writeFavorites(codes); // localStorage を権威（マージ後）に更新＝他コンポーネントへも伝播。
      setFavorites(toSet(codes));
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const persist = useCallback(
    (next: readonly string[]) => {
      if (isSignedIn) void saveFavoritesAction([...next]);
    },
    [isSignedIn],
  );

  const toggle = useCallback(
    (code: string) => {
      const next = toggleFavoriteStorage(code);
      setFavorites(toSet(next));
      persist(next);
    },
    [persist],
  );

  const isFavorite = useCallback(
    (code: string) => favorites.has(code.toUpperCase()),
    [favorites],
  );

  const clear = useCallback(() => {
    writeFavorites([]);
    setFavorites(new Set());
    persist([]);
  }, [persist]);

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
