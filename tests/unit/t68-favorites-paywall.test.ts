import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactElement } from 'react';

/**
 * T-68 決勝T課金壁・お気に入り（面④）のゲートを固める回帰テスト。
 *
 * 守りたい契約:
 *  A. ページ: 未購入×決勝T期間は本体（FavoritesPageView）を出さず PaywallLock に差し替え、
 *     かつ重い取得（listAllTeams / listTournamentMatches）を行わない。ヘッダは残す。
 *  B. ページ: アクセス可なら FavoritesPageView を描画し、取得も行う。
 *  C. サーバーアクション（saveFavoritesAction）の fail-closed 再チェック:
 *     - 未ログインは {ok:false}・書き込まない。
 *     - ログイン済みでもアクセス不可なら {ok:false}・書き込まない（UIゲートに依存しない）。
 *     - ログイン済み＋アクセス可のときだけ、自分の userId で setUserFavorites を呼ぶ。
 *  D. サーバーアクション（syncFavoritesAction）の fail-closed 再チェック:
 *     - お気に入り書き込みは sync マージ書き戻しも経路になる。アクセス不可なら書き戻さず、
 *       remote 取得にも到達しない（save と同一境界で迂回を塞ぐ）。アクセス可なら従来どおり動く。
 */

vi.mock('@mantine/core', () => ({
  Container: function Container() {
    return null;
  },
  Stack: function Stack() {
    return null;
  },
  Text: function Text() {
    return null;
  },
  Title: function Title() {
    return null;
  },
}));

vi.mock('@/components/FavoritesPageView', () => ({
  FavoritesPageView: function FavoritesPageView() {
    return null;
  },
}));
vi.mock('@/components/billing/PaywallLock', () => ({
  PaywallLock: function PaywallLock() {
    return null;
  },
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/db/queries', () => ({
  listAllTeams: vi.fn(async () => []),
  listTournamentMatches: vi.fn(async () => []),
  getUserFavorites: vi.fn(async () => []),
  setUserFavorites: vi.fn(async () => {}),
}));
vi.mock('@/lib/billing/access', () => ({ hasKnockoutAccess: vi.fn() }));
vi.mock('@/lib/i18n/server', () => ({ resolveLocale: vi.fn(async () => 'ja') }));

import { auth } from '@clerk/nextjs/server';

import FavoritesPage from '@/app/favorites/page';
import { saveFavoritesAction, syncFavoritesAction } from '@/app/favorites/actions';
import { FavoritesPageView } from '@/components/FavoritesPageView';
import { PaywallLock } from '@/components/billing/PaywallLock';
import {
  getUserFavorites,
  listAllTeams,
  listTournamentMatches,
  setUserFavorites,
} from '@/db/queries';
import { hasKnockoutAccess } from '@/lib/billing/access';

const authMock = vi.mocked(auth);
const listTeamsMock = vi.mocked(listAllTeams);
const listMatchesMock = vi.mocked(listTournamentMatches);
const setFavoritesMock = vi.mocked(setUserFavorites);
const getFavoritesMock = vi.mocked(getUserFavorites);
const hasAccessMock = vi.mocked(hasKnockoutAccess);

type AnyEl = ReactElement<{ children?: unknown }>;

/** FavoritesPage の返り値（Container > Stack[gap=lg]）から最後の子＝本体ノードを取り出す。 */
function bodyNode(result: AnyEl): AnyEl {
  const innerStack = result.props.children as AnyEl;
  const kids = innerStack.props.children as AnyEl[];
  return kids[kids.length - 1];
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('面④ お気に入りページの課金壁', () => {
  it('未購入×決勝T期間は PaywallLock を出し、重い取得を行わない', async () => {
    hasAccessMock.mockResolvedValue(false);

    const body = bodyNode((await FavoritesPage()) as AnyEl);

    expect(body.type).toBe(PaywallLock);
    expect(listTeamsMock).not.toHaveBeenCalled();
    expect(listMatchesMock).not.toHaveBeenCalled();
  });

  it('アクセス可なら FavoritesPageView を描画し、取得も行う', async () => {
    hasAccessMock.mockResolvedValue(true);

    const body = bodyNode((await FavoritesPage()) as AnyEl);

    expect(body.type).toBe(FavoritesPageView);
    expect(listTeamsMock).toHaveBeenCalled();
    expect(listMatchesMock).toHaveBeenCalled();
  });
});

describe('面④ saveFavoritesAction の fail-closed 再チェック', () => {
  it('未ログインは {ok:false}・書き込まない（アクセス判定にも到達しない）', async () => {
    authMock.mockResolvedValue({ userId: null } as never);

    const res = await saveFavoritesAction(['BRA']);

    expect(res).toEqual({ ok: false });
    expect(setFavoritesMock).not.toHaveBeenCalled();
    expect(hasAccessMock).not.toHaveBeenCalled();
  });

  it('ログイン済みでもアクセス不可なら {ok:false}・書き込まない（UIゲートに依存しない）', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(false);

    const res = await saveFavoritesAction(['BRA']);

    expect(res).toEqual({ ok: false });
    expect(setFavoritesMock).not.toHaveBeenCalled();
  });

  it('ログイン済み＋アクセス可のときだけ、自分の userId で書き込む', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(true);

    const res = await saveFavoritesAction(['BRA', 'ARG']);

    expect(res).toEqual({ ok: true });
    expect(setFavoritesMock).toHaveBeenCalledExactlyOnceWith('user_1', ['BRA', 'ARG']);
  });
});

describe('面④ syncFavoritesAction の fail-closed 再チェック（書き込み迂回を塞ぐ）', () => {
  it('ログイン済みでもアクセス不可なら書き戻さず localCodes を返し、remote 取得にも到達しない', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(false);

    const res = await syncFavoritesAction(['BRA']);

    // 未購入×決勝T期間: 受け取ったローカル分をそのまま返す（データ消失なし）。
    expect(res).toEqual({ codes: ['BRA'] });
    // 書き込み迂回を塞ぐ: setUserFavorites を呼ばない。
    expect(setFavoritesMock).not.toHaveBeenCalled();
    // アクセス判定で早期 return するので remote 取得（getUserFavorites）にも到達しない。
    expect(getFavoritesMock).not.toHaveBeenCalled();
  });

  it('アクセス可でマージにより増える場合は従来どおり書き戻す', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(true);
    getFavoritesMock.mockResolvedValue(['BRA']);

    const res = await syncFavoritesAction(['BRA', 'ARG']);

    expect(res).toEqual({ codes: ['BRA', 'ARG'] });
    expect(setFavoritesMock).toHaveBeenCalledExactlyOnceWith('user_1', ['BRA', 'ARG']);
  });

  it('アクセス可でもマージで増えないなら書き込まない（既存の無駄書き込み回避を保持）', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(true);
    getFavoritesMock.mockResolvedValue(['BRA', 'ARG']);

    const res = await syncFavoritesAction(['BRA']);

    expect(res).toEqual({ codes: ['BRA', 'ARG'] });
    expect(setFavoritesMock).not.toHaveBeenCalled();
  });

  it('未ログインは localCodes を返し、アクセス判定にも到達しない', async () => {
    authMock.mockResolvedValue({ userId: null } as never);

    const res = await syncFavoritesAction(['BRA']);

    expect(res).toEqual({ codes: ['BRA'] });
    expect(hasAccessMock).not.toHaveBeenCalled();
    expect(setFavoritesMock).not.toHaveBeenCalled();
  });
});
