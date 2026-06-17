import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactElement } from 'react';

/**
 * T-68 決勝T課金壁・トップ（HomeView）の表示ゲートを固める回帰テスト。
 *
 * 守りたい契約（面①カード表示 / 面②日付フィルタ）:
 *  1. 面②: 日付フィルタ結果（その日の全試合）は、未購入×決勝T期間では PaywallLock に
 *     差し替わり、しかも有料データ取得（listTournamentMatches）自体を行わない。
 *  2. 面②: アクセス可なら MatchDayList（実コンテンツ）を出し、取得も行う。
 *  3. 面①: 決勝T期間にカード表示が壁のとき、TournamentViewToggle へ cardLock として
 *     PaywallLock 要素を渡す（ブラケット表示は無料のまま＝トグル自体は出す）。
 *  4. 面①: アクセス可なら cardLock=undefined（ブラケットもカードも無料）。
 *  5. 非回帰: グループステージ期間の既定ビューは GroupsFilterableGrid（無料）で、壁は出ない。
 *
 * 方針: async Server Component を「関数として」呼び、返り値の React 要素を構造で検査する。
 * 子コンポーネント・Mantine・DB・i18n サーバ解決はスタブ化し、ゲート分岐だけを観測する。
 */

vi.mock('@mantine/core', () => ({
  Container: function Container() {
    return null;
  },
  Group: function Group() {
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

vi.mock('@/components/billing/PaywallLock', () => ({
  PaywallLock: function PaywallLock() {
    return null;
  },
}));
vi.mock('@/components/DateFilterBar', () => ({
  DateFilterBar: function DateFilterBar() {
    return null;
  },
}));
vi.mock('@/components/FavoriteFilterToggle', () => ({
  FavoriteFilterToggle: function FavoriteFilterToggle() {
    return null;
  },
}));
vi.mock('@/components/GroupsFilterableGrid', () => ({
  GroupsFilterableGrid: function GroupsFilterableGrid() {
    return null;
  },
}));
vi.mock('@/components/MatchDayList', () => ({
  MatchDayList: function MatchDayList() {
    return null;
  },
}));
vi.mock('@/components/MiniHero', () => ({
  MiniHero: function MiniHero() {
    return null;
  },
}));
vi.mock('@/components/TournamentViewToggle', () => ({
  TournamentViewToggle: function TournamentViewToggle() {
    return null;
  },
}));

vi.mock('@/lib/billing/access', () => ({ hasKnockoutAccess: vi.fn() }));
vi.mock('@/lib/i18n/server', () => ({
  resolveLocale: vi.fn(async () => 'ja'),
  resolveTimeZone: vi.fn(async () => 'Asia/Tokyo'),
}));
vi.mock('@/lib/pricing', async () => {
  const actual = await vi.importActual<typeof import('@/lib/pricing')>('@/lib/pricing');
  return { ...actual, isFreePeriod: vi.fn() };
});
vi.mock('@/db/queries', () => ({
  getGroupTeams: vi.fn(async () => []),
  listGroupStageMatches: vi.fn(async () => []),
  listTournamentMatches: vi.fn(async () => [{ id: 1 }]),
}));

import { HomeView, type HomeSearchParams } from '@/components/HomeView';
import { PaywallLock } from '@/components/billing/PaywallLock';
import { GroupsFilterableGrid } from '@/components/GroupsFilterableGrid';
import { MatchDayList } from '@/components/MatchDayList';
import { TournamentViewToggle } from '@/components/TournamentViewToggle';
import { hasKnockoutAccess } from '@/lib/billing/access';
import { listTournamentMatches } from '@/db/queries';
import { isFreePeriod } from '@/lib/pricing';

const hasAccessMock = vi.mocked(hasKnockoutAccess);
const isFreePeriodMock = vi.mocked(isFreePeriod);
const listMatchesMock = vi.mocked(listTournamentMatches);

type AnyEl = ReactElement<{ children?: unknown; cardLock?: unknown }>;

/** HomeView の返り値（Container > Stack[gap=lg]）から最後の子＝ゲート分岐ノードを取り出す。 */
function gatedBranch(result: AnyEl): AnyEl | AnyEl[] {
  const innerStack = result.props.children as AnyEl;
  const kids = innerStack.props.children as AnyEl[];
  return kids[kids.length - 1];
}

async function render(params: HomeSearchParams): Promise<AnyEl> {
  return (await HomeView({ searchParams: Promise.resolve(params) })) as AnyEl;
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('面② 日付フィルタの課金壁（HomeView）', () => {
  it('未購入×決勝T期間は PaywallLock を出し、有料データ取得を行わない', async () => {
    hasAccessMock.mockResolvedValue(false);
    isFreePeriodMock.mockReturnValue(false);

    const branch = gatedBranch(await render({ date: '2026-07-05' }));

    expect((branch as AnyEl).type).toBe(PaywallLock);
    expect(listMatchesMock).not.toHaveBeenCalled();
  });

  it('アクセス可なら MatchDayList（実コンテンツ）を出し、取得も行う', async () => {
    hasAccessMock.mockResolvedValue(true);
    isFreePeriodMock.mockReturnValue(false);

    const branch = gatedBranch(await render({ date: '2026-07-05' }));
    const first = Array.isArray(branch) ? branch[0] : branch;

    expect(first.type).toBe(MatchDayList);
    expect(listMatchesMock).toHaveBeenCalled();
  });
});

describe('面① カード表示の課金壁（HomeView）', () => {
  it('決勝T期間に未購入なら TournamentViewToggle へ cardLock=PaywallLock を渡す', async () => {
    hasAccessMock.mockResolvedValue(false);
    isFreePeriodMock.mockReturnValue(false);

    const branch = gatedBranch(await render({})) as AnyEl;

    expect(branch.type).toBe(TournamentViewToggle);
    const cardLock = branch.props.cardLock as AnyEl | undefined;
    expect(cardLock).toBeTruthy();
    expect(cardLock?.type).toBe(PaywallLock);
  });

  it('アクセス可なら cardLock=undefined（ブラケットもカードも無料）', async () => {
    hasAccessMock.mockResolvedValue(true);
    isFreePeriodMock.mockReturnValue(false);

    const branch = gatedBranch(await render({})) as AnyEl;

    expect(branch.type).toBe(TournamentViewToggle);
    expect(branch.props.cardLock).toBeUndefined();
  });
});

describe('非回帰: グループステージ期間の既定ビューは無料', () => {
  it('無料期間は GroupsFilterableGrid を出し、壁は出ない', async () => {
    // 無料期間は hasKnockoutAccess も true を返す（実装の単一真実）。
    hasAccessMock.mockResolvedValue(true);
    isFreePeriodMock.mockReturnValue(true);

    const branch = gatedBranch(await render({})) as AnyEl;

    expect(branch.type).toBe(GroupsFilterableGrid);
    expect(branch.type).not.toBe(PaywallLock);
  });
});
