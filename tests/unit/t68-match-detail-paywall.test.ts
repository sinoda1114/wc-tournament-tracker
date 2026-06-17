import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactElement } from 'react';

/**
 * T-68 決勝T課金壁・試合詳細（/matches/[id]）面③のゲートを固める回帰テスト。
 *
 * 守りたい契約:
 *  1. 存在する試合でも、未購入×決勝T期間では PaywallLock に差し替え、かつ重い取得
 *     （getMatchEvents / getVenueMatchSummary）を一切行わない（早期 return）。
 *  2. アクセス可なら本体を描画し、取得も行う（壁にならない）。
 *  3. ゲートは notFound より後ろ＝存在しない試合は課金状態に関係なく 404（壁で存在を漏らさない）。
 */

vi.mock('@mantine/core', () => ({
  Badge: function Badge() {
    return null;
  },
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

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/components/billing/PaywallLock', () => ({
  PaywallLock: function PaywallLock() {
    return null;
  },
}));
vi.mock('@/components/JsonLd', () => ({
  JsonLd: function JsonLd() {
    return null;
  },
}));
vi.mock('@/components/MatchEvents', () => ({
  MatchEvents: function MatchEvents() {
    return null;
  },
}));
vi.mock('@/components/MatchPitch', () => ({
  MatchPitch: function MatchPitch() {
    return null;
  },
}));
vi.mock('@/components/MatchVersus', () => ({
  MatchVersus: function MatchVersus() {
    return null;
  },
}));
vi.mock('@/components/VenueInfoCard', () => ({
  VenueInfoCard: function VenueInfoCard() {
    return null;
  },
}));
vi.mock('@/components/VenueWeather', () => ({
  VenueWeather: function VenueWeather() {
    return null;
  },
}));

vi.mock('@/db/match-events', () => ({ getMatchEvents: vi.fn(async () => []) }));
vi.mock('@/db/queries', () => ({
  getMatchDetail: vi.fn(),
  getTeamSquad: vi.fn(async () => null),
  getVenueMatchSummary: vi.fn(async () => null),
}));
vi.mock('@/lib/billing/access', () => ({ hasKnockoutAccess: vi.fn() }));
vi.mock('@/lib/i18n/server', () => ({
  resolveLocale: vi.fn(async () => 'ja'),
  resolveTimeZone: vi.fn(async () => 'Asia/Tokyo'),
}));
vi.mock('@/lib/env', () => ({ getSiteUrl: vi.fn(() => 'https://example.test') }));
vi.mock('@/lib/lineup/wikipedia-lineup', () => ({
  fetchMatchLineup: vi.fn(async () => null),
  shortLatinName: (s: string) => s,
}));
vi.mock('@/lib/bracket', () => ({
  formatKickoff: () => '12:00',
  formatMatchDateZoned: () => '7月5日',
  formatSlotLabel: () => 'slot',
}));
vi.mock('@/lib/structured-data', () => ({
  buildSportsEvent: vi.fn(() => ({})),
  buildBreadcrumbList: vi.fn(() => ({})),
}));

import MatchDetailPage from '@/app/matches/[id]/page';
import { PaywallLock } from '@/components/billing/PaywallLock';
import { getMatchEvents } from '@/db/match-events';
import { getMatchDetail, getVenueMatchSummary } from '@/db/queries';
import { hasKnockoutAccess } from '@/lib/billing/access';

const getMatchDetailMock = vi.mocked(getMatchDetail);
const getMatchEventsMock = vi.mocked(getMatchEvents);
const getVenueSummaryMock = vi.mocked(getVenueMatchSummary);
const hasAccessMock = vi.mocked(hasKnockoutAccess);

// 先発XI取得を誘発しないノックアウト試合（groupLetter なし・両チーム未確定）。
const knockoutMatch = {
  id: 51,
  stage: 'round_of_16',
  groupLetter: null,
  status: 'scheduled',
  kickoffAt: null,
  matchDate: '2026-07-05',
  venueId: 1,
  venue: { stadiumName: 'Stadium', city: 'City' },
  homeTeam: null,
  awayTeam: null,
  homeSlot: null,
  awaySlot: null,
};

type AnyEl = ReactElement<{ children?: unknown }>;

function renderPage(id: string): Promise<AnyEl> {
  return MatchDetailPage({ params: Promise.resolve({ id }) }) as Promise<AnyEl>;
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('面③ 試合詳細の課金壁（/matches/[id]）', () => {
  it('未購入×決勝T期間は PaywallLock に差し替え、重い取得を行わない', async () => {
    hasAccessMock.mockResolvedValue(false);
    getMatchDetailMock.mockResolvedValue(knockoutMatch as never);

    const res = await renderPage('51');
    const child = res.props.children as AnyEl;

    expect(child.type).toBe(PaywallLock);
    expect(getMatchEventsMock).not.toHaveBeenCalled();
    expect(getVenueSummaryMock).not.toHaveBeenCalled();
  });

  it('アクセス可なら本体を描画し、取得も行う（壁にならない）', async () => {
    hasAccessMock.mockResolvedValue(true);
    getMatchDetailMock.mockResolvedValue(knockoutMatch as never);

    const res = await renderPage('51');
    // 本体は <Container><JsonLd/><Stack/></Container> で children は配列（壁の単一子ではない）。
    expect(Array.isArray(res.props.children)).toBe(true);
    expect(getMatchEventsMock).toHaveBeenCalledWith(51);
    expect(getVenueSummaryMock).toHaveBeenCalled();
  });

  it('存在しない試合は課金状態に関係なく notFound（壁より先に 404・存在を漏らさない）', async () => {
    hasAccessMock.mockResolvedValue(false);
    getMatchDetailMock.mockResolvedValue(null as never);

    await expect(renderPage('99999')).rejects.toThrow('NEXT_NOT_FOUND');
    // notFound で抜けるため、課金判定にすら到達しない。
    expect(hasAccessMock).not.toHaveBeenCalled();
  });
});
