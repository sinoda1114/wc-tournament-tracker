import { describe, expect, it } from 'vitest';

import type { NormalizedResult } from '@/lib/ingest/types';
import { planMatchUpdates, type ReconcileMatch } from '@/lib/ingest/reconcile';

const teams = [
  { id: 'mex', nameEn: 'Mexico', fifaCode: 'MEX' },
  { id: 'rsa', nameEn: 'South Africa', fifaCode: 'RSA' },
  { id: 'bra', nameEn: 'Brazil', fifaCode: 'BRA' },
  { id: 'mar', nameEn: 'Morocco', fifaCode: 'MAR' },
  { id: 'fra', nameEn: 'France', fifaCode: 'FRA' },
  { id: 'eng', nameEn: 'England', fifaCode: 'ENG' },
];

function match(partial: Partial<ReconcileMatch> & { id: number }): ReconcileMatch {
  return {
    matchDate: '2026-06-11',
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    stage: 'group_stage',
    groupLetter: 'A',
    ...partial,
  };
}

function result(partial: Partial<NormalizedResult>): NormalizedResult {
  return {
    dateEvent: '2026-06-11',
    homeName: 'Mexico',
    awayName: 'South Africa',
    homeScore: 2,
    awayScore: 1,
    finished: true,
    ...partial,
  };
}

describe('planMatchUpdates', () => {
  it('日付＋チームペアが一致する予定試合に終了結果を反映する', () => {
    const matches = [
      match({ id: 1, homeTeamId: 'mex', awayTeamId: 'rsa' }),
    ];
    const updates = planMatchUpdates([result({})], matches, teams);
    expect(updates).toEqual([
      { matchId: 1, homeScore: 2, awayScore: 1, status: 'finished' },
    ]);
  });

  it('home/away の向きが逆でも自チーム基準でスコアを割り当てる', () => {
    // 我々の行は rsa(home) vs mex(away)。結果は Mexico(home) 2 - 1 South Africa。
    const matches = [
      match({ id: 7, homeTeamId: 'rsa', awayTeamId: 'mex' }),
    ];
    const updates = planMatchUpdates([result({})], matches, teams);
    expect(updates).toEqual([
      { matchId: 7, homeScore: 1, awayScore: 2, status: 'finished' },
    ]);
  });

  it('取得元の日付が ±1 日ずれていても同ペアの行に反映する', () => {
    // 我々の seed は 06-11、TheSportsDB は 06-12 のように1日ずれるケース。
    const matches = [
      match({ id: 1, homeTeamId: 'mex', awayTeamId: 'rsa', matchDate: '2026-06-11' }),
    ];
    const updates = planMatchUpdates(
      [result({ dateEvent: '2026-06-12' })],
      matches,
      teams,
    );
    expect(updates).toEqual([
      { matchId: 1, homeScore: 2, awayScore: 1, status: 'finished' },
    ]);
  });

  it('既に同じスコアで finished の行は更新しない（冪等）', () => {
    const matches = [
      match({
        id: 1,
        homeTeamId: 'mex',
        awayTeamId: 'rsa',
        homeScore: 2,
        awayScore: 1,
        status: 'finished',
      }),
    ];
    expect(planMatchUpdates([result({})], matches, teams)).toEqual([]);
  });

  it('スコアが変わっていれば finished 済みでも更新する（訂正）', () => {
    const matches = [
      match({
        id: 1,
        homeTeamId: 'mex',
        awayTeamId: 'rsa',
        homeScore: 1,
        awayScore: 1,
        status: 'finished',
      }),
    ];
    const updates = planMatchUpdates([result({})], matches, teams);
    expect(updates).toEqual([
      { matchId: 1, homeScore: 2, awayScore: 1, status: 'finished' },
    ]);
  });

  it('チーム名が解決できない結果はスキップ', () => {
    const matches = [match({ id: 1, homeTeamId: 'mex', awayTeamId: 'rsa' })];
    const updates = planMatchUpdates(
      [result({ homeName: 'Atlantis' })],
      matches,
      teams,
    );
    expect(updates).toEqual([]);
  });

  it('対応する試合行が無ければスキップ（日付不一致）', () => {
    const matches = [
      match({ id: 1, homeTeamId: 'mex', awayTeamId: 'rsa', matchDate: '2026-07-01' }),
    ];
    expect(planMatchUpdates([result({})], matches, teams)).toEqual([]);
  });

  it('決勝Tでまだチーム未確定の行はスキップ', () => {
    const matches = [
      match({ id: 90, stage: 'round_of_32', homeTeamId: null, awayTeamId: null }),
    ];
    expect(planMatchUpdates([result({})], matches, teams)).toEqual([]);
  });

  it('未終了（ライブ/予定）の結果は反映しない', () => {
    const matches = [match({ id: 1, homeTeamId: 'mex', awayTeamId: 'rsa' })];
    const updates = planMatchUpdates(
      [result({ finished: false, homeScore: null, awayScore: null })],
      matches,
      teams,
    );
    expect(updates).toEqual([]);
  });

  it('決勝Tの同点（PK決着）は勝者不明のためスキップ（手入力に委ねる）', () => {
    const matches = [
      match({
        id: 95,
        stage: 'quarter_final',
        homeTeamId: 'fra',
        awayTeamId: 'eng',
        matchDate: '2026-07-04',
      }),
    ];
    const updates = planMatchUpdates(
      [
        result({
          dateEvent: '2026-07-04',
          homeName: 'France',
          awayName: 'England',
          homeScore: 1,
          awayScore: 1,
        }),
      ],
      matches,
      teams,
    );
    expect(updates).toEqual([]);
  });

  it('グループステージの引き分けは通常どおり反映する', () => {
    const matches = [
      match({ id: 2, homeTeamId: 'bra', awayTeamId: 'mar', matchDate: '2026-06-12' }),
    ];
    const updates = planMatchUpdates(
      [
        result({
          dateEvent: '2026-06-12',
          homeName: 'Brazil',
          awayName: 'Morocco',
          homeScore: 0,
          awayScore: 0,
        }),
      ],
      matches,
      teams,
    );
    expect(updates).toEqual([
      { matchId: 2, homeScore: 0, awayScore: 0, status: 'finished' },
    ]);
  });
});
