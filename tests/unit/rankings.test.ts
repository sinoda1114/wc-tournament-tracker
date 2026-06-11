import { describe, expect, it } from 'vitest';

import { aggregateCards, aggregateScorers, type RankingEvent } from '@/lib/rankings';

/** 集計テストでは試合情報は使わないので固定値で埋める。 */
const MATCH_META = { teamId: 'x', matchId: 1, matchDate: '2026-06-01', stage: 'group_stage' } as const;

function goal(player: string, fifa: string | null, penalty = false): RankingEvent {
  return {
    type: penalty ? 'penalty_goal' : 'goal',
    playerName: player,
    teamFifaCode: fifa,
    teamNameEn: fifa,
    teamNameJa: fifa,
    ...MATCH_META,
    teamId: fifa,
  };
}

function card(player: string, fifa: string | null, color: 'yellow' | 'red'): RankingEvent {
  return {
    type: color === 'yellow' ? 'yellow_card' : 'red_card',
    playerName: player,
    teamFifaCode: fifa,
    teamNameEn: fifa,
    teamNameJa: fifa,
    ...MATCH_META,
    teamId: fifa,
  };
}

describe('aggregateScorers', () => {
  it('goal と penalty_goal を選手別に合算する', () => {
    const result = aggregateScorers([
      goal('Mbappé', 'FRA'),
      goal('Mbappé', 'FRA', true), // PK も得点に数える
      goal('Kane', 'ENG'),
    ]);
    expect(result[0]).toMatchObject({ playerName: 'Mbappé', goals: 2 });
    expect(result[1]).toMatchObject({ playerName: 'Kane', goals: 1 });
  });

  it('own_goal は得点者に数えない', () => {
    const result = aggregateScorers([
      goal('Kane', 'ENG'),
      {
        type: 'own_goal',
        playerName: 'Kane',
        teamId: 'ENG',
        teamFifaCode: 'ENG',
        teamNameEn: 'ENG',
        teamNameJa: 'ENG',
        matchId: 1,
        matchDate: '2026-06-01',
        stage: 'group_stage',
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].goals).toBe(1);
  });

  it('得点数の降順、同数は選手名昇順で並ぶ', () => {
    const result = aggregateScorers([
      goal('Zoe', 'A'),
      goal('Zoe', 'A'),
      goal('Ann', 'B'),
      goal('Ann', 'B'),
      goal('Bob', 'C'),
    ]);
    expect(result.map((r) => r.playerName)).toEqual(['Ann', 'Zoe', 'Bob']);
    expect(result.map((r) => r.goals)).toEqual([2, 2, 1]);
  });

  it('同名でもチームが違えば別集計', () => {
    const result = aggregateScorers([goal('Silva', 'BRA'), goal('Silva', 'POR')]);
    expect(result).toHaveLength(2);
  });

  it('カードイベントは無視する', () => {
    expect(aggregateScorers([card('Kane', 'ENG', 'yellow')])).toEqual([]);
  });
});

describe('aggregateCards', () => {
  it('黄・赤を選手別に数える', () => {
    const result = aggregateCards([
      card('Ramos', 'ESP', 'yellow'),
      card('Ramos', 'ESP', 'yellow'),
      card('Ramos', 'ESP', 'red'),
      card('Kane', 'ENG', 'yellow'),
    ]);
    expect(result[0]).toMatchObject({ playerName: 'Ramos', yellow: 2, red: 1 });
    expect(result.find((r) => r.playerName === 'Kane')).toMatchObject({ yellow: 1, red: 0 });
  });

  it('赤の多い順 → 黄の多い順 → 名前順', () => {
    const result = aggregateCards([
      card('Ann', 'A', 'yellow'),
      card('Ann', 'A', 'yellow'),
      card('Bob', 'B', 'red'),
      card('Cid', 'C', 'yellow'),
    ]);
    expect(result.map((r) => r.playerName)).toEqual(['Bob', 'Ann', 'Cid']);
  });

  it('得点イベントは無視する', () => {
    expect(aggregateCards([goal('Kane', 'ENG')])).toEqual([]);
  });
});
