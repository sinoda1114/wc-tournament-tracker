import { describe, expect, it } from 'vitest';

import {
  auditMatches,
  type AuditGoalEvent,
  type AuditMatchInput,
} from '@/lib/ingest/audit';

const NOW = new Date('2026-06-14T22:00:00Z');

function match(overrides: Partial<AuditMatchInput> = {}): AuditMatchInput {
  return {
    id: 1,
    stage: 'group_stage',
    groupLetter: 'E',
    homeTeamId: 'AUS',
    awayTeamId: 'TUR',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    kickoffAt: null,
    matchDate: '2026-06-14',
    ...overrides,
  };
}

function goal(overrides: Partial<AuditGoalEvent> = {}): AuditGoalEvent {
  return { matchId: 1, type: 'goal', teamId: 'AUS', ...overrides };
}

describe('auditMatches - 鮮度監査 (stale_unfinished)', () => {
  it('KO後しきい値を過ぎた未終了試合をerrorで検知する (T-81)', () => {
    const m = match({ kickoffAt: '2026-06-14T13:00:00Z', status: 'scheduled' });

    const report = auditMatches([m], [], { now: NOW, staleHours: 2.5 });

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({
      matchId: 1,
      kind: 'stale_unfinished',
      severity: 'error',
    });
    expect(report.counts.staleUnfinished).toBe(1);
  });

  it('in_progress のまま長時間経過した試合も検知する', () => {
    const m = match({ kickoffAt: '2026-06-14T13:00:00Z', status: 'in_progress' });

    const report = auditMatches([m], [], { now: NOW, staleHours: 2.5 });

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].kind).toBe('stale_unfinished');
  });

  it('KO直後（しきい値内）は検知しない', () => {
    const m = match({ kickoffAt: '2026-06-14T21:00:00Z', status: 'scheduled' });

    const report = auditMatches([m], [], { now: NOW, staleHours: 2.5 });

    expect(report.findings).toHaveLength(0);
  });

  it('finished 試合は古くても鮮度監査の対象外', () => {
    const m = match({
      kickoffAt: '2026-06-14T13:00:00Z',
      status: 'finished',
      homeScore: 0,
      awayScore: 0,
    });

    const report = auditMatches([m], [], { now: NOW, staleHours: 2.5 });

    expect(report.findings).toHaveLength(0);
  });

  it('チーム未確定（TBD枠）は鮮度監査の対象外', () => {
    const m = match({
      kickoffAt: '2026-06-14T13:00:00Z',
      status: 'scheduled',
      homeTeamId: null,
      awayTeamId: null,
    });

    const report = auditMatches([m], [], { now: NOW, staleHours: 2.5 });

    expect(report.findings).toHaveLength(0);
  });

  it('決勝Tは延長猶予(+1.5h)があり KO+2.5h 時点の in_progress は誤検知しない', () => {
    // KO 19:00Z、NOW 22:00Z（KO+3h）。決勝Tの実効しきい値は 2.5+1.5=4h なので未検知。
    const m = match({
      stage: 'round_of_32',
      groupLetter: null,
      status: 'in_progress',
      kickoffAt: '2026-06-14T19:00:00Z',
    });

    const report = auditMatches([m], [], { now: NOW, staleHours: 2.5 });

    expect(report.findings).toHaveLength(0);
  });

  it('決勝Tでも実効しきい値(4h)を超えれば検知する', () => {
    // KO 17:00Z、NOW 22:00Z（KO+5h > 4h）→ 検知。
    const m = match({
      stage: 'round_of_32',
      groupLetter: null,
      status: 'in_progress',
      kickoffAt: '2026-06-14T17:00:00Z',
    });

    const report = auditMatches([m], [], { now: NOW, staleHours: 2.5 });

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].kind).toBe('stale_unfinished');
  });

  it('グループステージは KO+2.5h で検知する（決勝Tと差がある）', () => {
    // KO 19:00Z、NOW 22:00Z（KO+3h > 2.5h）→ グループは検知。
    const m = match({
      stage: 'group_stage',
      status: 'in_progress',
      kickoffAt: '2026-06-14T19:00:00Z',
    });

    const report = auditMatches([m], [], { now: NOW, staleHours: 2.5 });

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].kind).toBe('stale_unfinished');
  });

  it('kickoffAt が無い場合は matchDate翌日+しきい値で判定する', () => {
    // matchDate=6/12 → 翌日0:00Z(6/13) + 2.5h = 6/13 02:30Z。NOW(6/14)は超過。
    const m = match({ kickoffAt: null, matchDate: '2026-06-12', status: 'scheduled' });

    const report = auditMatches([m], [], { now: NOW, staleHours: 2.5 });

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].kind).toBe('stale_unfinished');
  });

  it('kickoffAt が無く同日の試合は誤検知しない', () => {
    const m = match({ kickoffAt: null, matchDate: '2026-06-14', status: 'scheduled' });

    const report = auditMatches([m], [], { now: NOW, staleHours: 2.5 });

    expect(report.findings).toHaveLength(0);
  });
});

describe('auditMatches - 整合監査 (scorers)', () => {
  const finished = (homeScore: number, awayScore: number): AuditMatchInput =>
    match({ status: 'finished', homeScore, awayScore });

  it('得点者がスコアに足りない試合をwarnで検知する (T-76)', () => {
    const m = finished(2, 1); // 合計3
    const events = [goal({ teamId: 'AUS' })]; // 1件しかない

    const report = auditMatches([m], events, { now: NOW });

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({
      matchId: 1,
      kind: 'scorers_incomplete',
      severity: 'warn',
    });
    expect(report.findings[0].context).toMatchObject({ totalScore: 3, eventGoals: 1 });
    expect(report.counts.scoreMismatch).toBe(1);
  });

  it('得点イベントが過多な試合をwarnで検知する', () => {
    const m = finished(1, 0); // 合計1
    const events = [goal({ teamId: 'AUS' }), goal({ teamId: 'AUS' })]; // 2件

    const report = auditMatches([m], events, { now: NOW });

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].kind).toBe('scorers_excess');
  });

  it('得点者とスコアが一致すれば検知しない', () => {
    const m = finished(2, 1);
    const events = [
      goal({ teamId: 'AUS' }),
      goal({ teamId: 'AUS' }),
      goal({ teamId: 'TUR' }),
    ];

    const report = auditMatches([m], events, { now: NOW });

    expect(report.findings).toHaveLength(0);
  });

  it('own_goal を相手側の得点として正しく扱う', () => {
    // AUS 1-0 TUR。唯一の得点が TUR選手のオウンゴール（team_id=TUR）→ home(AUS)の得点。
    const m = finished(1, 0);
    const events = [goal({ type: 'own_goal', teamId: 'TUR' })];

    const report = auditMatches([m], events, { now: NOW });

    expect(report.findings).toHaveLength(0);
  });

  it('合計一致でも左右割当がズレていれば弱検知する', () => {
    // 記録は 2-1 だが、得点者集計は AUS3-0（TUR得点が誤って AUS に付与）。
    const m = finished(2, 1);
    const events = [
      goal({ teamId: 'AUS' }),
      goal({ teamId: 'AUS' }),
      goal({ teamId: 'AUS' }),
    ];

    const report = auditMatches([m], events, { now: NOW });

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].kind).toBe('scorers_side_mismatch');
    expect(report.findings[0].context).toMatchObject({ derivedHome: 3, derivedAway: 0 });
  });

  it('team_id 未解決のイベントがあれば左右チェックはスキップ（合計一致なら無所見）', () => {
    const m = finished(1, 1);
    const events = [goal({ teamId: null }), goal({ teamId: null })];

    const report = auditMatches([m], events, { now: NOW });

    expect(report.findings).toHaveLength(0);
  });

  it('0-0 の試合は得点イベント0件でも検知しない', () => {
    const m = finished(0, 0);

    const report = auditMatches([m], [], { now: NOW });

    expect(report.findings).toHaveLength(0);
  });

  it('PK決着（90分同点・決勝T）でスコア合計とイベントが一致すれば無所見', () => {
    // 1-1 で終了（PKは別）。得点イベントは各1。
    const m = match({
      stage: 'round_of_32',
      groupLetter: null,
      status: 'finished',
      homeScore: 1,
      awayScore: 1,
    });
    const events = [goal({ teamId: 'AUS' }), goal({ teamId: 'TUR' })];

    const report = auditMatches([m], events, { now: NOW });

    expect(report.findings).toHaveLength(0);
  });
});

describe('auditMatches - レポート集計', () => {
  it('checkedMatches と generatedAt を返す', () => {
    const report = auditMatches([match(), match({ id: 2 })], [], { now: NOW });

    expect(report.checkedMatches).toBe(2);
    expect(report.generatedAt).toBe(NOW.toISOString());
  });

  it('複数試合の所見を種別ごとに集計する', () => {
    const stale = match({ id: 10, kickoffAt: '2026-06-14T13:00:00Z' });
    const incomplete = match({ id: 11, status: 'finished', homeScore: 3, awayScore: 0 });

    const report = auditMatches([stale, incomplete], [goal({ matchId: 11 })], {
      now: NOW,
      staleHours: 2.5,
    });

    expect(report.counts.staleUnfinished).toBe(1);
    expect(report.counts.scoreMismatch).toBe(1);
    expect(report.findings).toHaveLength(2);
  });
});
