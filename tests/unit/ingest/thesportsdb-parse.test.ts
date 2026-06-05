import { describe, expect, it } from 'vitest';

import { parseTheSportsDbEvents, recentDates } from '@/lib/ingest/thesportsdb';

const raw = {
  events: [
    {
      dateEvent: '2026-06-11',
      strHomeTeam: 'Mexico',
      strAwayTeam: 'South Africa',
      intHomeScore: '2',
      intAwayScore: '1',
      strStatus: 'Match Finished',
      strPostponed: 'no',
    },
    {
      dateEvent: '2026-06-12',
      strHomeTeam: 'Brazil',
      strAwayTeam: 'Morocco',
      intHomeScore: null,
      intAwayScore: null,
      strStatus: 'Not Started',
      strPostponed: 'no',
    },
    {
      dateEvent: '2026-06-13',
      strHomeTeam: 'Spain',
      strAwayTeam: 'Uruguay',
      intHomeScore: null,
      intAwayScore: null,
      strStatus: 'Match Postponed',
      strPostponed: 'yes',
    },
    {
      dateEvent: '2026-06-14',
      strHomeTeam: 'France',
      strAwayTeam: 'Senegal',
      intHomeScore: '1',
      intAwayScore: '1',
      strStatus: '2H',
      strPostponed: 'no',
    },
  ],
};

describe('parseTheSportsDbEvents', () => {
  it('全イベントを NormalizedResult に変換する', () => {
    const results = parseTheSportsDbEvents(raw);
    expect(results).toHaveLength(4);
  });

  it('終了試合: スコアを数値化し finished=true', () => {
    const r = parseTheSportsDbEvents(raw)[0];
    expect(r).toMatchObject({
      dateEvent: '2026-06-11',
      homeName: 'Mexico',
      awayName: 'South Africa',
      homeScore: 2,
      awayScore: 1,
      finished: true,
    });
  });

  it('未実施(Not Started): finished=false・スコア null', () => {
    const r = parseTheSportsDbEvents(raw)[1];
    expect(r.finished).toBe(false);
    expect(r.homeScore).toBeNull();
    expect(r.awayScore).toBeNull();
  });

  it('延期(postponed): finished=false', () => {
    expect(parseTheSportsDbEvents(raw)[2].finished).toBe(false);
  });

  it('試合中(ライブ): スコアはあるが finished=false', () => {
    const r = parseTheSportsDbEvents(raw)[3];
    expect(r.homeScore).toBe(1);
    expect(r.awayScore).toBe(1);
    expect(r.finished).toBe(false);
  });

  it('events が無い/壊れた入力は空配列', () => {
    expect(parseTheSportsDbEvents({ events: null })).toEqual([]);
    expect(parseTheSportsDbEvents({})).toEqual([]);
    expect(parseTheSportsDbEvents(null)).toEqual([]);
  });
});

describe('recentDates', () => {
  it('当日から過去 days 日分を古い順で返す', () => {
    const today = new Date('2026-06-14T08:00:00Z');
    expect(recentDates(3, today)).toEqual(['2026-06-12', '2026-06-13', '2026-06-14']);
  });

  it('1日指定なら当日のみ', () => {
    expect(recentDates(1, new Date('2026-06-14T08:00:00Z'))).toEqual(['2026-06-14']);
  });

  it('不正な日数は既定（3日）にフォールバック', () => {
    expect(recentDates(0, new Date('2026-06-14T08:00:00Z'))).toHaveLength(3);
    expect(recentDates(Number.NaN, new Date('2026-06-14T08:00:00Z'))).toHaveLength(3);
  });
});
