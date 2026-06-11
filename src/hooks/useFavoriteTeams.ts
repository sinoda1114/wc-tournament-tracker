'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';

import { saveFavoritesAction, syncFavoritesAction } from '@/app/favorites/actions';
import {
  FAVORITES_CHANGED_EVENT,
  FAVORITES_KEY,
  FILTER_KEY,
  mergeFavoriteCodes,
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
 * 初回サーバ同期をページロード内で「1回だけ」走らせるためのモジュールレベル・ガード。
 * useFavoriteTeams は FavoriteStar ごとに多数インスタンス化されるため、per-instance の
 * ref だとインスタンス数ぶん syncFavoritesAction が走り、各々が古いスナップショットで
 * localStorage を上書きして、押したばかりのトグルを巻き戻す競合（「すぐ戻る」）を起こす。
 * モジュールスコープで集約し、ログアウト時にリセットする。
 */
let globalSyncDone = false;

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
  // 直前にログイン済みだったか（ログアウト遷移の検知用）。
  const wasSignedInRef = useRef(false);

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

  // ログイン状態に応じてサーバ同期 / ログアウト時の端末クリーンアップを行う。
  useEffect(() => {
    // Clerk 読み込み前（isSignedIn === undefined）は確定していないので何もしない。
    if (isSignedIn === undefined) return;

    if (isSignedIn) {
      wasSignedInRef.current = true;
      // 多数の FavoriteStar が同時マウントしても同期は1回だけ（モジュールレベルで集約）。
      if (globalSyncDone) return;
      globalSyncDone = true;

      let cancelled = false;
      void syncFavoritesAction(readFavorites()).then(({ codes }) => {
        // 同期の往復中にユーザーがトグルした分を失わないよう、解決「時点」のローカル最新と
        // 和集合してから書き戻す（古いスナップショットでの上書き＝巻き戻りを防ぐ）。
        // ※ 同期中の「削除」は和集合では戻りうるが、窓は一往復ぶんと短いため許容する。
        const merged = mergeFavoriteCodes(codes, readFavorites());
        writeFavorites(merged); // localStorage を更新＝全 FavoriteStar へイベント伝播。
        if (!cancelled) setFavorites(toSet(merged));
      });
      return () => {
        cancelled = true;
      };
    }

    // 未ログイン確定。次回ログイン時に再同期できるようガードを戻す。
    globalSyncDone = false;

    // 直前までログインしていたなら「ログアウト」確定（#39）。
    // ログイン中はサーバの user_favorites を localStorage へ書き戻すため、ログアウト後も
    // 端末に★が残り、同じ端末の次の匿名訪問者に他人のお気に入りが見えてしまう。
    // ここで端末ローカルのみ一掃する（サーバ側は消さない＝次回ログインで本人の分は復元される）。
    if (wasSignedInRef.current) {
      wasSignedInRef.current = false;
      writeFavorites([]); // CustomEvent 発火で同タブの他コンポーネント表示も即クリア。
      setFavorites(new Set());
    }
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
