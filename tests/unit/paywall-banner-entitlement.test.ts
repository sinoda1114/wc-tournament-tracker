import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactElement } from 'react';

/**
 * T-98 予告バナー（PaywallBanner / #26）の表示ゲートを固める回帰テスト。
 *
 * 守りたい契約:
 *  1. 無料期間（決勝T開始前）以外は何も出さない（`null`）。
 *  2. 無料期間中でも **購入済み（entitlement あり）ユーザーには出さない**（`null`）。
 *     ← これが T-98 の本丸。バナーを誰かが触ったときに entitlement チェックを
 *        外してしまう退行（#114 で警戒したケース）を、ここで自動検知する。
 *  3. 無料期間中の未購入ユーザー / 匿名ユーザーには出す（`<aside>`）。
 *  4. entitlement 判定が DB 障害で throw したときは fail-open（告知の取りこぼしを
 *     避けるためバナーを出す）。
 *
 * 方針: async Server Component を「関数として」呼び、返り値の React 要素を
 * 構造（type / props）で検査する。DOM レンダリングは不要なので jsdom も使わない。
 */

vi.mock('next/server', () => ({
  connection: vi.fn(async () => {}),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/db/queries/billing', () => ({
  hasActiveEntitlement: vi.fn(),
}));

// 期間判定だけ差し替え、価格表示ヘルパー（PRICE_TABLE 由来）は実物を使う。
vi.mock('@/lib/pricing', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/pricing')>('@/lib/pricing');
  return { ...actual, isFreePeriod: vi.fn() };
});

// next/link を持ち込む client component の評価を避けるため AnchorLink はスタブ化。
// 構造検査だけなので描画はしない（要素の type / props だけ見る）。
vi.mock('@/components/RouterLink', () => ({
  AnchorLink: function AnchorLink() {
    return null;
  },
}));

import { auth } from '@clerk/nextjs/server';

import { PaywallBanner } from '@/components/PaywallBanner';
import { hasActiveEntitlement } from '@/db/queries/billing';
import { ja } from '@/lib/i18n/messages/ja';
import { isFreePeriod } from '@/lib/pricing';

const authMock = vi.mocked(auth);
const hasEntitlementMock = vi.mocked(hasActiveEntitlement);
const isFreePeriodMock = vi.mocked(isFreePeriod);

type ElProps = {
  className?: string;
  href?: string;
  'aria-label'?: string;
  children?: unknown;
};

type BannerResult = Awaited<ReturnType<typeof PaywallBanner>>;

function expectElement(node: BannerResult): ReactElement {
  if (node === null) {
    throw new Error('バナー要素を期待したが null が返った');
  }
  return node;
}

function childArray(el: ReactElement): ReactElement[] {
  const { children } = el.props as ElProps;
  return Array.isArray(children)
    ? (children as ReactElement[])
    : [children as ReactElement];
}

/** auth() のモック解決値を userId だけ差し込んでバナーを描画する。 */
async function renderBanner(userId: string | null): Promise<BannerResult> {
  authMock.mockResolvedValue({ userId } as unknown as Awaited<
    ReturnType<typeof auth>
  >);
  return PaywallBanner({ locale: 'ja', dict: ja });
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('PaywallBanner 表示ゲート（T-98）', () => {
  it('無料期間外は何も出さず、auth / entitlement も問い合わせない', async () => {
    isFreePeriodMock.mockReturnValue(false);

    const res = await renderBanner('user_paid');

    expect(res).toBeNull();
    expect(authMock).not.toHaveBeenCalled();
    expect(hasEntitlementMock).not.toHaveBeenCalled();
  });

  it('無料期間中でも購入済みユーザーには出さない（T-98 本丸の退行ガード）', async () => {
    isFreePeriodMock.mockReturnValue(true);
    hasEntitlementMock.mockResolvedValue(true);

    const res = await renderBanner('user_paid');

    expect(res).toBeNull();
    // entitlement チェックが「その userId で」実際に走ったことまで担保する。
    expect(hasEntitlementMock).toHaveBeenCalledWith('user_paid');
  });

  it('無料期間中の未購入ユーザーには /buy CTA 付きバナーを出す', async () => {
    isFreePeriodMock.mockReturnValue(true);
    hasEntitlementMock.mockResolvedValue(false);

    const res = expectElement(await renderBanner('user_free'));

    expect(res.type).toBe('aside');
    expect((res.props as ElProps).className).toBe('wc-paywall-banner');
    expect((res.props as ElProps)['aria-label']).toBe(ja.paywall.bannerAria);

    const cta = childArray(res).find(
      (k) => k && (k.props as ElProps).className === 'wc-paywall-banner-cta',
    );
    expect((cta?.props as ElProps | undefined)?.href).toBe('/buy');
    expect(hasEntitlementMock).toHaveBeenCalledWith('user_free');
  });

  it('匿名ユーザーには出すが、entitlement は問い合わせない', async () => {
    isFreePeriodMock.mockReturnValue(true);

    const res = expectElement(await renderBanner(null));

    expect(res.type).toBe('aside');
    expect(hasEntitlementMock).not.toHaveBeenCalled();
  });

  it('entitlement 判定が DB 障害で throw したら fail-open（バナーを出す）', async () => {
    isFreePeriodMock.mockReturnValue(true);
    hasEntitlementMock.mockRejectedValue(new Error('db down'));

    const res = expectElement(await renderBanner('user_paid'));

    expect(res.type).toBe('aside');
  });
});
