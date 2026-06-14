import { describe, expect, it } from 'vitest';

import { deriveMatchDataState, type MatchDataStateInput } from '@/lib/match-data-state';

const NOW = new Date('2026-06-14T22:00:00Z');

function input(overrides: Partial<MatchDataStateInput> = {}): MatchDataStateInput {
  return {
    status: 'scheduled',
    stage: 'group_stage',
    kickoffAt: '2026-06-14T13:00:00Z',
    matchDate: '2026-06-14',
    homeScore: null,
    awayScore: null,
    now: NOW,
    ...overrides,
  };
}

describe('deriveMatchDataState', () => {
  it('KO後しきい値超過で未終了なら pending（データ確認中）', () => {
    expect(deriveMatchDataState(input({ status: 'scheduled' }))).toBe('pending');
  });

  it('KO直後（しきい値内）の未終了は confirmed（通常表示）', () => {
    expect(
      deriveMatchDataState(input({ status: 'scheduled', kickoffAt: '2026-06-14T21:00:00Z' })),
    ).toBe('confirmed');
  });

  it('決勝Tは延長猶予でしきい値が長い（KO+3hの未終了は confirmed）', () => {
    expect(
      deriveMatchDataState(
        input({
          stage: 'round_of_32',
          status: 'in_progress',
          kickoffAt: '2026-06-14T19:00:00Z',
        }),
      ),
    ).toBe('confirmed');
  });

  it('終了済みで得点者がスコアに足りなければ provisional（速報/暫定）', () => {
    expect(
      deriveMatchDataState(
        input({ status: 'finished', homeScore: 2, awayScore: 1, goalEventCount: 1 }),
      ),
    ).toBe('provisional');
  });

  it('終了済みで得点者がスコアと一致すれば confirmed', () => {
    expect(
      deriveMatchDataState(
        input({ status: 'finished', homeScore: 2, awayScore: 1, goalEventCount: 3 }),
      ),
    ).toBe('confirmed');
  });

  it('goalEventCount 未指定なら provisional 判定をしない（一覧カード等）', () => {
    expect(
      deriveMatchDataState(input({ status: 'finished', homeScore: 2, awayScore: 1 })),
    ).toBe('confirmed');
  });

  it('0-0 終了は得点イベント0でも confirmed', () => {
    expect(
      deriveMatchDataState(
        input({ status: 'finished', homeScore: 0, awayScore: 0, goalEventCount: 0 }),
      ),
    ).toBe('confirmed');
  });
});
