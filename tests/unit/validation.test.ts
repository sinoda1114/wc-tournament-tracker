import { describe, expect, it } from 'vitest';

import { adminPasswordSchema, matchUpdateSchema } from '@/lib/validation';

const valid = {
  matchId: 5,
  homeScore: 2,
  awayScore: 1,
  winnerTeamId: 'bra',
  status: 'finished' as const,
};

describe('matchUpdateSchema', () => {
  it('正しい入力を受理する', () => {
    expect(matchUpdateSchema.safeParse(valid).success).toBe(true);
  });

  it('null スコア（未確定）を許容する', () => {
    const r = matchUpdateSchema.safeParse({
      matchId: 5,
      homeScore: null,
      awayScore: null,
      winnerTeamId: null,
      status: 'scheduled',
    });
    expect(r.success).toBe(true);
  });

  it('winnerTeamId は省略できる', () => {
    const r = matchUpdateSchema.safeParse({
      matchId: 5,
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
    });
    expect(r.success).toBe(true);
  });

  it('負のスコアを拒否する', () => {
    expect(matchUpdateSchema.safeParse({ ...valid, homeScore: -1 }).success).toBe(false);
  });

  it('非整数スコアを拒否する', () => {
    expect(matchUpdateSchema.safeParse({ ...valid, homeScore: 1.5 }).success).toBe(false);
  });

  it('未知のステータスを拒否する', () => {
    expect(matchUpdateSchema.safeParse({ ...valid, status: 'pending' }).success).toBe(false);
  });

  it('matchId が非正なら拒否する', () => {
    expect(matchUpdateSchema.safeParse({ ...valid, matchId: 0 }).success).toBe(false);
  });
});

describe('adminPasswordSchema', () => {
  it('非空文字列を受理する', () => {
    expect(adminPasswordSchema.safeParse('hunter2').success).toBe(true);
  });
  it('空文字を拒否する', () => {
    expect(adminPasswordSchema.safeParse('').success).toBe(false);
  });
  it('長すぎる入力を拒否する', () => {
    expect(adminPasswordSchema.safeParse('x'.repeat(201)).success).toBe(false);
  });
});
