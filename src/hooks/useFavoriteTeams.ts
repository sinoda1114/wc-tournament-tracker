'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addFavoriteAction,
  removeFavoriteAction,
  saveFavoritesAction,
  syncFavoritesAction,
} from '@/app/favorites/actions';
import {
  addAnonPending,
  clearAnonPending,
  FAVORITES_CHANGED_EVENT,
  FAVORITES_KEY,
  FILTER_KEY,
  readAnonPending,
  readFavorites,
  readFilterEnabled,
  removeAnonPending,
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
/** focus/可視化時の再取得が多数インスタンスで重複しないよう、進行中フラグで1回に集約する。 */
let revalidateInFlight = false;

/**
 * お気に入りチーム集合をクライアント側で扱う Hook。
 *
 * - SSR 初回は空集合で hydrate される（DOM 側がサーバー描画と一致するように）。
 * - localStorage を即時キャッシュとして使い、`storage`（他タブ）/`wc:favorites-changed`
 *   （同タブ）イベントで最新に保つ。
 * - **ログイン中はサーバ（user_favorites）を正として同期**して端末間で一致させる:
 *   マウント時とフォーカス/可視化時にサーバ状態を採用する（古いローカルとは和集合しない＝
 *   他端末で消した★を蘇らせない）。トグルは楽観的UI＋**単品デルタ**（add/remove）でサーバへ
 *   反映する（全件上書きしないので古い端末が他端末の削除を巻き戻さない）。ログアウト中に
 *   付けた★だけ、次回ログインで加算マージする。
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
      // サーバを正として採用する。ローカルの古いキャッシュとは**和集合しない**（他端末で消した
      // ★が蘇る経路を断つ）。ログアウト中に付けた★（anon-pending）だけは加算マージする。
      const snapshot = JSON.stringify(readFavorites());
      void syncFavoritesAction(readAnonPending()).then(({ codes }) => {
        clearAnonPending(); // 保留分はサーバへ反映済み。
        // 同期の往復中にユーザーがトグルしていたら、その操作（単品デルタは永続済み）を上書き
        // しない。ローカルが変わっていない（idle）ときだけサーバ状態を採用する。
        if (JSON.stringify(readFavorites()) !== snapshot) return;
        writeFavorites(codes); // localStorage を更新＝全 FavoriteStar へイベント伝播。
        if (!cancelled) setFavorites(toSet(codes));
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
      clearAnonPending();
      setFavorites(new Set());
    }
  }, [isSignedIn]);

  // (B) 端末復帰（フォーカス/可視化）時にサーバを取り直して採用＝端末間を“見た瞬間”に同期する。
  useEffect(() => {
    if (isSignedIn !== true) return;
    const revalidate = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (revalidateInFlight) return; // 多数インスタンスの同時発火を1リクエストに集約。
      revalidateInFlight = true;
      const snapshot = JSON.stringify(readFavorites());
      void syncFavoritesAction([])
        .then(({ codes }) => {
          // 取得中にユーザーがトグルしていたら上書きしない（操作のデルタは永続済み）。
          if (JSON.stringify(readFavorites()) !== snapshot) return;
          writeFavorites(codes);
        })
        .finally(() => {
          revalidateInFlight = false;
        });
    };
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [isSignedIn]);

  const toggle = useCallback(
    (code: string) => {
      const normalized = code.trim().toUpperCase();
      if (!normalized) return;
      const next = toggleFavoriteStorage(code);
      setFavorites(toSet(next));
      const nowFavorite = next.includes(normalized);
      if (isSignedIn) {
        // 単品デルタで保存（全件上書きしない＝古い端末が他端末の削除を巻き戻す事故を防ぐ）。
        void (nowFavorite ? addFavoriteAction(normalized) : removeFavoriteAction(normalized));
      } else if (nowFavorite) {
        // 未ログイン時はローカルのみ。ログアウト中に付けた★は次回ログインで加算マージする。
        addAnonPending(normalized);
      } else {
        removeAnonPending(normalized);
      }
    },
    [isSignedIn],
  );

  const isFavorite = useCallback(
    (code: string) => favorites.has(code.toUpperCase()),
    [favorites],
  );

  const clear = useCallback(() => {
    writeFavorites([]);
    setFavorites(new Set());
    clearAnonPending();
    // 「すべて解除」は端末の意思による全件クリア＝全件置換で空にする（単品デルタではない）。
    if (isSignedIn) void saveFavoritesAction([]);
  }, [isSignedIn]);

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
