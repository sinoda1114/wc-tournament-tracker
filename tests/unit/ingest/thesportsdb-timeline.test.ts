import { describe, expect, it } from 'vitest';

import { parseTheSportsDbTimeline } from '@/lib/ingest/thesportsdb';

/** TheSportsDB lookuptimeline.php の代表的なレスポンス断片。 */
const raw = {
  timeline: [
    {
      idTimeline: '713849',
      strTimeline: 'Goal',
      strTimelineDetail: 'Normal Goal',
      strHome: 'Yes',
      intTime: '23',
      strPlayer: 'Granit Xhaka',
      strAssist: 'Xherdan Shaqiri',
    },
    {
      idTimeline: '713850',
      strTimeline: 'Goal',
      strTimelineDetail: 'Own Goal',
      strHome: 'No',
      intTime: '38',
      strPlayer: 'John Doe',
      strAssist: '',
    },
    {
      idTimeline: '713851',
      strTimeline: 'Goal',
      strTimelineDetail: 'Penalty',
      strHome: 'Yes',
      intTime: '45+2',
      strPlayer: 'Kylian Mbappe',
      strAssist: '',
    },
    {
      idTimeline: '713852',
      strTimeline: 'Card',
      strTimelineDetail: 'Yellow Card',
      strHome: 'No',
      intTime: '51',
      strPlayer: 'Casemiro',
      strAssist: '',
    },
    {
      idTimeline: '713853',
      strTimeline: 'Card',
      strTimelineDetail: 'Red Card',
      strHome: 'No',
      intTime: '77',
      strPlayer: 'Sergio Ramos',
      strAssist: '',
    },
    {
      idTimeline: '713854',
      strTimeline: 'subst',
      strTimelineDetail: 'Substitution 1',
      strHome: 'Yes',
      intTime: '60',
      strPlayer: 'Breel Embolo',
      strAssist: 'Haris Seferovic',
    },
  ],
};

describe('parseTheSportsDbTimeline', () => {
  it('得点・カード・交代を NormalizedMatchEvent に変換する', () => {
    const events = parseTheSportsDbTimeline(raw);
    expect(events).toHaveLength(6);
  });

  it('通常ゴール: type=goal・アシストは playerOut へ', () => {
    const e = parseTheSportsDbTimeline(raw)[0];
    expect(e).toMatchObject({
      type: 'goal',
      minute: 23,
      isHome: true,
      playerName: 'Granit Xhaka',
      playerOut: 'Xherdan Shaqiri',
      externalId: '713849',
    });
  });

  it('オウンゴール: type=own_goal・strHome=No は isHome=false', () => {
    const e = parseTheSportsDbTimeline(raw)[1];
    expect(e.type).toBe('own_goal');
    expect(e.isHome).toBe(false);
    expect(e.playerOut).toBeNull();
  });

  it('PKゴール: type=penalty_goal・"45+2" は 45 分に丸める', () => {
    const e = parseTheSportsDbTimeline(raw)[2];
    expect(e.type).toBe('penalty_goal');
    expect(e.minute).toBe(45);
  });

  it('カード: Yellow/Red を区別する', () => {
    const events = parseTheSportsDbTimeline(raw);
    expect(events[3].type).toBe('yellow_card');
    expect(events[4].type).toBe('red_card');
  });

  it('交代: playerName=IN・playerOut=OUT', () => {
    const e = parseTheSportsDbTimeline(raw)[5];
    expect(e).toMatchObject({
      type: 'substitution',
      playerName: 'Breel Embolo',
      playerOut: 'Haris Seferovic',
    });
  });

  it('PK失敗・VAR など対象外の種別はスキップする', () => {
    const events = parseTheSportsDbTimeline({
      timeline: [
        { idTimeline: '1', strTimeline: 'Goal', strTimelineDetail: 'Missed Penalty', strHome: 'Yes', intTime: '10', strPlayer: 'A' },
        { idTimeline: '2', strTimeline: 'Var', strTimelineDetail: 'Goal cancelled', strHome: 'Yes', intTime: '20', strPlayer: 'B' },
        { idTimeline: '3', strTimeline: 'Card', strTimelineDetail: '', strHome: 'Yes', intTime: '30', strPlayer: 'C' },
      ],
    });
    expect(events).toEqual([]);
  });

  it('選手名が空の行はスキップする（player_name NOT NULL のため）', () => {
    const events = parseTheSportsDbTimeline({
      timeline: [
        { idTimeline: '1', strTimeline: 'Goal', strTimelineDetail: 'Normal Goal', strHome: 'Yes', intTime: '10', strPlayer: '' },
      ],
    });
    expect(events).toEqual([]);
  });

  it('分が欠落/範囲外（DB CHECK 0..130）は minute=null にする', () => {
    const events = parseTheSportsDbTimeline({
      timeline: [
        { idTimeline: '1', strTimeline: 'Goal', strTimelineDetail: 'Normal Goal', strHome: 'Yes', intTime: '', strPlayer: 'A' },
        { idTimeline: '2', strTimeline: 'Goal', strTimelineDetail: 'Normal Goal', strHome: 'Yes', intTime: '999', strPlayer: 'B' },
      ],
    });
    expect(events[0].minute).toBeNull();
    expect(events[1].minute).toBeNull();
  });

  it('strHome が欠落した行は isHome=null（teamId 未確定として扱う）', () => {
    const events = parseTheSportsDbTimeline({
      timeline: [
        { idTimeline: '1', strTimeline: 'Goal', strTimelineDetail: 'Normal Goal', intTime: '10', strPlayer: 'A' },
      ],
    });
    expect(events[0].isHome).toBeNull();
  });

  it('idTimeline 欠落時は位置ベースの externalId を振る（試合内で一意）', () => {
    const events = parseTheSportsDbTimeline({
      timeline: [
        { strTimeline: 'Goal', strTimelineDetail: 'Normal Goal', strHome: 'Yes', intTime: '10', strPlayer: 'A' },
        { strTimeline: 'Goal', strTimelineDetail: 'Normal Goal', strHome: 'Yes', intTime: '20', strPlayer: 'B' },
      ],
    });
    expect(events[0].externalId).not.toBe(events[1].externalId);
  });

  it('timeline が無い/壊れた入力は空配列', () => {
    expect(parseTheSportsDbTimeline({ timeline: null })).toEqual([]);
    expect(parseTheSportsDbTimeline({})).toEqual([]);
    expect(parseTheSportsDbTimeline(null)).toEqual([]);
  });
});
