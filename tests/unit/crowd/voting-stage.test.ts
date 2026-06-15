import { describe, expect, it } from 'vitest';

import type { Match } from '@/db/queries';
import { aliveTeamIdsForStage, currentVotingStage } from '@/lib/crowd';

function m(partial: Partial<Match> & { stage: string }): Match {
  return {
    id: 1,
    matchDate: '2026-06-11',
    kickoffAt: null,
    venueId: 'v1',
    homeSlot: 'A1',
    awaySlot: 'A2',
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    status: 'scheduled',
    groupLetter: null,
    highlightSummary: null,
    highlightUrl: null,
    highlightSourceLabel: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('currentVotingStage', () => {
  it('グループ戦に未終了があれば group_stage', () => {
    const matches = [
      m({ stage: 'group_stage', status: 'finished', winnerTeamId: 'a', homeTeamId: 'a', awayTeamId: 'b', homeScore: 1, awayScore: 0 }),
      m({ stage: 'group_stage', status: 'scheduled' }),
      m({ stage: 'round_of_32', status: 'scheduled' }),
    ];
    expect(currentVotingStage(matches)).toBe('group_stage');
  });

  it('グループ戦が全終了し R32 に未終了があれば round_of_32', () => {
    const matches = [
      m({ stage: 'group_stage', status: 'finished', winnerTeamId: 'a', homeTeamId: 'a', awayTeamId: 'b', homeScore: 1, awayScore: 0 }),
      m({ stage: 'round_of_32', status: 'scheduled' }),
    ];
    expect(currentVotingStage(matches)).toBe('round_of_32');
  });

  it('全試合終了なら null（投票締切）', () => {
    const fin = { status: 'finished' as const, winnerTeamId: 'a', homeTeamId: 'a', awayTeamId: 'b', homeScore: 1, awayScore: 0 };
    const matches = [
      m({ stage: 'group_stage', ...fin }),
      m({ stage: 'final', ...fin }),
    ];
    expect(currentVotingStage(matches)).toBeNull();
  });

  it('third_place は投票ステージに含めない（finalで判定）', () => {
    const fin = { status: 'finished' as const, winnerTeamId: 'a', homeTeamId: 'a', awayTeamId: 'b', homeScore: 1, awayScore: 0 };
    const matches = [
      m({ stage: 'group_stage', ...fin }),
      m({ stage: 'semi_final', ...fin }),
      m({ stage: 'third_place', status: 'scheduled' }),
      m({ stage: 'final', status: 'scheduled' }),
    ];
    expect(currentVotingStage(matches)).toBe('final');
  });
});

describe('aliveTeamIdsForStage', () => {
  it('指定ステージの出場チームを返す（重複なし）', () => {
    const matches = [
      m({ stage: 'round_of_16', homeTeamId: 'fra', awayTeamId: 'eng' }),
      m({ stage: 'round_of_16', homeTeamId: 'bra', awayTeamId: 'arg' }),
      m({ stage: 'quarter_final', homeTeamId: 'fra', awayTeamId: 'bra' }),
    ];
    expect(aliveTeamIdsForStage(matches, 'round_of_16').sort()).toEqual(
      ['arg', 'bra', 'eng', 'fra'],
    );
  });

  it('チーム未確定（null）の枠は除外する', () => {
    const matches = [
      m({ stage: 'round_of_32', homeTeamId: 'fra', awayTeamId: null }),
    ];
    expect(aliveTeamIdsForStage(matches, 'round_of_32')).toEqual(['fra']);
  });
});
