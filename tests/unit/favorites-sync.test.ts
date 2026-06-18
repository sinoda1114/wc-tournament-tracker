import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 端末間お気に入り同期の整合性（サーバ権威 + 単品デルタ）の回帰テスト。
 *
 * 守りたい契約（不具合: PCで消した★がスマホ操作で蘇る、の再発防止）:
 *  1. syncFavoritesAction は **サーバを正**として返す。anonAdds が空なら、端末ローカルの
 *     古いキャッシュと和集合せず remote をそのまま返す＝他端末の削除を蘇らせない。
 *  2. anonAdds（ログアウト中に付けた★）があるときだけ加算マージする（加算のみ）。
 *  3. add/removeFavoriteAction は単品デルタを DB へ適用し、fail-closed（未ログイン/未購入×
 *     決勝T期間）では DB に触れない。
 */

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/db/queries', () => ({
  getUserFavorites: vi.fn(async () => []),
  setUserFavorites: vi.fn(async () => {}),
  addUserFavorite: vi.fn(async () => {}),
  removeUserFavorite: vi.fn(async () => {}),
}));
vi.mock('@/lib/billing/access', () => ({ hasKnockoutAccess: vi.fn() }));

import { auth } from '@clerk/nextjs/server';

import {
  addFavoriteAction,
  removeFavoriteAction,
  syncFavoritesAction,
} from '@/app/favorites/actions';
import {
  addUserFavorite,
  getUserFavorites,
  removeUserFavorite,
  setUserFavorites,
} from '@/db/queries';
import { hasKnockoutAccess } from '@/lib/billing/access';

const authMock = vi.mocked(auth);
const getFavoritesMock = vi.mocked(getUserFavorites);
const setFavoritesMock = vi.mocked(setUserFavorites);
const addFavoriteMock = vi.mocked(addUserFavorite);
const removeFavoriteMock = vi.mocked(removeUserFavorite);
const hasAccessMock = vi.mocked(hasKnockoutAccess);

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('syncFavoritesAction（サーバ権威）', () => {
  it('anonAdds が空なら remote をそのまま返し、書き戻さない（古いローカルと和集合しない）', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(true);
    // サーバ（他端末で PRY を削除済み）= ['JPN'] のみ。
    getFavoritesMock.mockResolvedValue(['JPN']);

    const res = await syncFavoritesAction([]);

    // 端末ローカルに PRY が残っていても、anonAdds 経由で渡らない限り蘇らない。
    expect(res).toEqual({ codes: ['JPN'] });
    expect(setFavoritesMock).not.toHaveBeenCalled();
  });

  it('anonAdds（ログアウト中の★）があるときだけ加算マージして書き戻す', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(true);
    getFavoritesMock.mockResolvedValue(['JPN']);

    const res = await syncFavoritesAction(['BRA']);

    expect(res).toEqual({ codes: ['JPN', 'BRA'] });
    expect(setFavoritesMock).toHaveBeenCalledExactlyOnceWith('user_1', ['JPN', 'BRA']);
  });

  it('加算しても増えない（既にサーバにある）なら書き込まない', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(true);
    getFavoritesMock.mockResolvedValue(['JPN', 'BRA']);

    const res = await syncFavoritesAction(['BRA']);

    expect(res).toEqual({ codes: ['JPN', 'BRA'] });
    expect(setFavoritesMock).not.toHaveBeenCalled();
  });

  it('未購入×決勝T期間（fail-closed）は DB に触れず anonAdds を返す', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(false);

    const res = await syncFavoritesAction(['BRA']);

    expect(res).toEqual({ codes: ['BRA'] });
    expect(getFavoritesMock).not.toHaveBeenCalled();
    expect(setFavoritesMock).not.toHaveBeenCalled();
  });

  it('未ログインは anonAdds を返し、アクセス判定にも到達しない', async () => {
    authMock.mockResolvedValue({ userId: null } as never);

    const res = await syncFavoritesAction(['BRA']);

    expect(res).toEqual({ codes: ['BRA'] });
    expect(hasAccessMock).not.toHaveBeenCalled();
  });
});

describe('addFavoriteAction / removeFavoriteAction（単品デルタ）', () => {
  it('add: ログイン＋アクセス可なら1件だけ追加する', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(true);

    const res = await addFavoriteAction('JPN');

    expect(res).toEqual({ ok: true });
    expect(addFavoriteMock).toHaveBeenCalledExactlyOnceWith('user_1', 'JPN');
  });

  it('remove: ログイン＋アクセス可なら1件だけ削除する（他端末の追加を巻き戻さない）', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(true);

    const res = await removeFavoriteAction('PRY');

    expect(res).toEqual({ ok: true });
    expect(removeFavoriteMock).toHaveBeenCalledExactlyOnceWith('user_1', 'PRY');
  });

  it('未ログインは {ok:false}・DB に触れない', async () => {
    authMock.mockResolvedValue({ userId: null } as never);

    expect(await addFavoriteAction('JPN')).toEqual({ ok: false });
    expect(await removeFavoriteAction('JPN')).toEqual({ ok: false });
    expect(addFavoriteMock).not.toHaveBeenCalled();
    expect(removeFavoriteMock).not.toHaveBeenCalled();
    expect(hasAccessMock).not.toHaveBeenCalled();
  });

  it('未購入×決勝T期間は {ok:false}・DB に触れない（fail-closed）', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' } as never);
    hasAccessMock.mockResolvedValue(false);

    expect(await addFavoriteAction('JPN')).toEqual({ ok: false });
    expect(await removeFavoriteAction('JPN')).toEqual({ ok: false });
    expect(addFavoriteMock).not.toHaveBeenCalled();
    expect(removeFavoriteMock).not.toHaveBeenCalled();
  });
});
