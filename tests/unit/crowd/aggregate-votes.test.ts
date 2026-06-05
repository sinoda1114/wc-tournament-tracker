import { describe, expect, it } from 'vitest';

import { aggregateLatestVotes, type CrowdVote } from '@/lib/crowd';

function obj(map: Map<string, number>): Record<string, number> {
  return Object.fromEntries(map);
}

describe('aggregateLatestVotes', () => {
  it('1ユーザー1票はそのまま集計', () => {
    const votes: CrowdVote[] = [{ voterId: 'u1', stage: 'group_stage', teamId: 'bra' }];
    expect(obj(aggregateLatestVotes(votes))).toEqual({ bra: 1 });
  });

  it('同一ユーザーは最も進んだステージの票だけを採用する', () => {
    const votes: CrowdVote[] = [
      { voterId: 'u1', stage: 'group_stage', teamId: 'bra' },
      { voterId: 'u1', stage: 'round_of_16', teamId: 'fra' },
    ];
    // 最新（round_of_16）の fra のみ。bra は数えない。
    expect(obj(aggregateLatestVotes(votes))).toEqual({ fra: 1 });
  });

  it('複数ユーザーをチーム別に集計', () => {
    const votes: CrowdVote[] = [
      { voterId: 'u1', stage: 'final', teamId: 'fra' },
      { voterId: 'u2', stage: 'group_stage', teamId: 'fra' },
      { voterId: 'u3', stage: 'group_stage', teamId: 'bra' },
    ];
    expect(obj(aggregateLatestVotes(votes))).toEqual({ fra: 2, bra: 1 });
  });

  it('空入力は空マップ', () => {
    expect(aggregateLatestVotes([]).size).toBe(0);
  });
});
