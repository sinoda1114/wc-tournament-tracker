import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactElement } from 'react';

/**
 * T-68 決勝T課金壁・優勝予想ページ（面⑤）のゲートを固める回帰テスト。
 *
 * 守りたい契約:
 *  1. 投票パネル（VotePanel）はアクセス可のときだけ描画する。
 *  2. アクセス不可なら PaywallLock に差し替える（resolveAccess によるサーバ判定。詐称不可）。
 *  3. 非回帰: 優勝予想（ChampionPrediction）は常設＝アクセス可否に関わらず必ず描画する（無料）。
 *
 * ※ 面⑤のゲートは T-52 で既設。本テストは「誰かが access チェックを外す/常時表示にする」退行を
 *    自動検知するための固定。
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

vi.mock('@/components/billing/EarlyBirdPurchase', () => ({
  EarlyBirdPurchase: function EarlyBirdPurchase() {
    return null;
  },
}));
vi.mock('@/components/billing/PaywallLock', () => ({
  PaywallLock: function PaywallLock() {
    return null;
  },
}));
vi.mock('@/components/ChampionPrediction', () => ({
  ChampionPrediction: function ChampionPrediction() {
    return null;
  },
}));
vi.mock('@/components/VotePanel', () => ({
  VotePanel: function VotePanel() {
    return null;
  },
}));

vi.mock('@/lib/billing/access', () => ({ resolveAccess: vi.fn() }));
vi.mock('@/db/queries', () => ({
  getMyVotes: vi.fn(async () => ({})),
  listCrowdVotes: vi.fn(async () => []),
  listTeamRatings: vi.fn(async () => []),
  listTournamentMatches: vi.fn(async () => []),
}));
vi.mock('@/lib/i18n/server', () => ({ resolveLocale: vi.fn(async () => 'ja') }));
vi.mock('@/lib/voter', () => ({ readVoterId: vi.fn(async () => null) }));

import PredictionPage from '@/app/prediction/page';
import { ChampionPrediction } from '@/components/ChampionPrediction';
import { PaywallLock } from '@/components/billing/PaywallLock';
import { VotePanel } from '@/components/VotePanel';
import { resolveAccess } from '@/lib/billing/access';

const resolveAccessMock = vi.mocked(resolveAccess);

type AnyEl = ReactElement<{ children?: unknown }>;

/** PredictionPage の返り値（Container > Stack[gap=lg]）の子配列を取り出す。 */
function innerChildren(result: AnyEl): AnyEl[] {
  const innerStack = result.props.children as AnyEl;
  return innerStack.props.children as AnyEl[];
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('面⑤ 優勝予想ページの課金壁', () => {
  it('アクセス不可なら投票パネルの位置に PaywallLock を出す', async () => {
    resolveAccessMock.mockResolvedValue({ hasAccess: false } as never);

    const kids = innerChildren((await PredictionPage()) as AnyEl);

    expect(kids[kids.length - 1].type).toBe(PaywallLock);
    // 非回帰: 優勝予想は常設で残る。
    expect(kids.some((k) => k && k.type === ChampionPrediction)).toBe(true);
  });

  it('アクセス可なら VotePanel を描画する', async () => {
    resolveAccessMock.mockResolvedValue({ hasAccess: true } as never);

    const kids = innerChildren((await PredictionPage()) as AnyEl);

    expect(kids[kids.length - 1].type).toBe(VotePanel);
    expect(kids.some((k) => k && k.type === ChampionPrediction)).toBe(true);
  });
});
