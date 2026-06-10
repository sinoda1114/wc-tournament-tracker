import { describe, expect, it } from 'vitest';

import { planMatchEventSyncs, toAutoMatchEvents } from '@/lib/ingest/reconcile';
import type { ReconcileMatch } from '@/lib/ingest/reconcile';
import type { NormalizedMatchEvent, NormalizedResult } from '@/lib/ingest/types';

const TEAMS = [
  { id: 'mex', nameEn: 'Mexico', fifaCode: 'MEX' },
  { id: 'rsa', nameEn: 'South Africa', fifaCode: 'RSA' },
  { id: 'bra', nameEn: 'Brazil', fifaCode: 'BRA' },
];

function matchRow(id: number, home: string | null, away: string | null, over: Partial<ReconcileMatch> = {}): ReconcileMatch {
  return {
    id,
    matchDate: '2026-06-11',
    homeTeamId: home,
    awayTeamId: away,
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    stage: 'group_stage',
    ...over,
  };
}

function result(over: Partial<NormalizedResult> = {}): NormalizedResult {
  return {
    dateEvent: '2026-06-11',
    homeName: 'Mexico',
    awayName: 'South Africa',
    homeScore: 2,
    awayScore: 1,
    finished: true,
    externalEventId: '100',
    ...over,
  };
}

describe('planMatchEventSyncs', () => {
  it('終了試合×externalEventId あり → 突き合った試合の同期計画を返す', () => {
    const plans = planMatchEventSyncs([result()], [matchRow(1, 'mex', 'rsa')], TEAMS);
    expect(plans).toEqual([
      { matchId: 1, externalEventId: '100', homeTeamId: 'mex', awayTeamId: 'rsa' },
    ]);
  });

  it('homeTeamId/awayTeamId は取得元の向き（結果スキップ済み試合の手入力補完にも使える）', () => {
    // 取得元の home/away が我々の行と逆でも、取得元の向きで保持する
    // （タイムラインの strHome は取得元の home 基準のため）。
    const reversed = result({ homeName: 'South Africa', awayName: 'Mexico' });
    const finished = matchRow(1, 'mex', 'rsa', { status: 'finished', homeScore: 1, awayScore: 2 });
    const plans = planMatchEventSyncs([reversed], [finished], TEAMS);
    expect(plans).toEqual([
      { matchId: 1, externalEventId: '100', homeTeamId: 'rsa', awayTeamId: 'mex' },
    ]);
  });

  it('既に結果が入っている（スコア更新不要の）試合も同期対象に含める', () => {
    const finished = matchRow(1, 'mex', 'rsa', { status: 'finished', homeScore: 2, awayScore: 1 });
    const plans = planMatchEventSyncs([result()], [finished], TEAMS);
    expect(plans).toHaveLength(1);
  });

  it('externalEventId の無い結果は対象外', () => {
    const plans = planMatchEventSyncs(
      [result({ externalEventId: null }), result({ externalEventId: undefined })],
      [matchRow(1, 'mex', 'rsa')],
      TEAMS,
    );
    expect(plans).toEqual([]);
  });

  it('未終了の結果は対象外', () => {
    const plans = planMatchEventSyncs(
      [result({ finished: false })],
      [matchRow(1, 'mex', 'rsa')],
      TEAMS,
    );
    expect(plans).toEqual([]);
  });

  it('チーム名が解決できない/突き合う試合が無い場合は対象外', () => {
    const plans = planMatchEventSyncs(
      [
        result({ homeName: 'Atlantis' }),
        result({ homeName: 'Brazil', awayName: 'Mexico' }), // この対戦カードの試合行は無い
      ],
      [matchRow(1, 'mex', 'rsa')],
      TEAMS,
    );
    expect(plans).toEqual([]);
  });

  it('日付が ±1 日を超える試合は突き合わせない', () => {
    const plans = planMatchEventSyncs(
      [result({ dateEvent: '2026-06-20' })],
      [matchRow(1, 'mex', 'rsa')],
      TEAMS,
    );
    expect(plans).toEqual([]);
  });

  it('同一試合は重複させない（dedupe by matchId）', () => {
    const plans = planMatchEventSyncs(
      [result(), result({ externalEventId: '999' })],
      [matchRow(1, 'mex', 'rsa')],
      TEAMS,
    );
    expect(plans).toHaveLength(1);
  });
});

describe('toAutoMatchEvents', () => {
  const sync = { homeTeamId: 'mex', awayTeamId: 'rsa' };

  function event(over: Partial<NormalizedMatchEvent> = {}): NormalizedMatchEvent {
    return {
      type: 'goal',
      minute: 10,
      isHome: true,
      playerName: 'A',
      playerOut: null,
      externalId: '1',
      ...over,
    };
  }

  it('isHome=true は homeTeamId、false は awayTeamId、null は teamId=null', () => {
    const out = toAutoMatchEvents(
      [event({ isHome: true }), event({ isHome: false, externalId: '2' }), event({ isHome: null, externalId: '3' })],
      sync,
    );
    expect(out.map((e) => e.teamId)).toEqual(['mex', 'rsa', null]);
  });

  it('sortOrder はタイムライン順（index）で振る', () => {
    const out = toAutoMatchEvents([event(), event({ externalId: '2' })], sync);
    expect(out.map((e) => e.sortOrder)).toEqual([0, 1]);
  });

  it('type/minute/選手名/externalId をそのまま引き継ぐ', () => {
    const out = toAutoMatchEvents(
      [event({ type: 'substitution', minute: 60, playerName: 'In', playerOut: 'Out', externalId: '9' })],
      sync,
    );
    expect(out[0]).toMatchObject({
      type: 'substitution',
      minute: 60,
      playerName: 'In',
      playerOut: 'Out',
      externalId: '9',
    });
  });
});
