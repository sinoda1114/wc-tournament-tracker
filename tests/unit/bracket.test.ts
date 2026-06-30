import { describe, expect, it } from 'vitest';

import {
  STAGE_LABELS,
  STAGE_ORDER,
  formatKickoffJst,
  formatMatchDate,
  formatMatchDateJst,
  formatSlotLabel,
  formatSlotTitle,
  getParticipantLabel,
  groupMatchesByStage,
  isWinner,
} from '@/lib/bracket';
import type { MatchDetail } from '@/db/queries';
import { en } from '@/lib/i18n/messages/en';

function buildMatch(overrides: Partial<MatchDetail>): MatchDetail {
  return {
    id: 1,
    stage: 'round_of_32',
    matchDate: '2026-06-28',
    kickoffAt: null,
    venueId: 'los_angeles',
    homeSlot: 'Group A runners-up',
    awaySlot: 'Group B runners-up',
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    penaltyHomeScore: null,
    penaltyAwayScore: null,
    winnerTeamId: null,
    status: 'scheduled',
    groupLetter: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    venue: {
      id: 'los_angeles',
      stadiumName: 'SoFi Stadium',
      city: 'Inglewood',
      state: 'California',
      country: 'USA',
      countryCode: 'USA',
      countryFlag: '🇺🇸',
      capacity: 70000,
      roofType: 'translucent',
      elevationM: null,
      pastWorldCups: [],
    },
    homeTeam: null,
    awayTeam: null,
    winnerTeam: null,
    ...overrides,
  };
}

describe('STAGE_ORDER', () => {
  it('contains all six stages in tournament order', () => {
    expect(STAGE_ORDER).toEqual([
      'round_of_32',
      'round_of_16',
      'quarter_final',
      'semi_final',
      'third_place',
      'final',
    ]);
  });

  it('STAGE_LABELS covers every stage', () => {
    for (const stage of STAGE_ORDER) {
      expect(STAGE_LABELS[stage]).toBeTypeOf('string');
    }
  });
});

describe('groupMatchesByStage', () => {
  it('groups matches into stage columns and filters empty stages', () => {
    const matches = [
      buildMatch({ id: 73, stage: 'round_of_32' }),
      buildMatch({ id: 89, stage: 'round_of_16' }),
      buildMatch({ id: 104, stage: 'final' }),
    ];

    const columns = groupMatchesByStage(matches);

    expect(columns.map((c) => c.stage)).toEqual([
      'round_of_32',
      'round_of_16',
      'final',
    ]);
    expect(columns[0].matches).toHaveLength(1);
    expect(columns[0].matches[0].id).toBe(73);
  });
});

describe('formatMatchDate', () => {
  it('returns month/day with weekday in Japanese (no year)', () => {
    expect(formatMatchDate('2026-06-28')).toBe('6/28(日)');
    expect(formatMatchDate('2026-07-14')).toBe('7/14(火)');
    expect(formatMatchDate('2026-07-15')).toBe('7/15(水)');
    expect(formatMatchDate('2026-07-18')).toBe('7/18(土)');
    expect(formatMatchDate('2026-07-19')).toBe('7/19(日)');
  });
});

describe('formatMatchDateJst', () => {
  it('決勝(会場ローカル 7/19 15:00 ET)は JST の 7/20(月) を返す', () => {
    // 会場ローカル matchDate は 7/19 だが、kickoffAt を JST に変換すると翌日。
    // 同じカードの時刻表示(JST)と一致させる。
    expect(
      formatMatchDateJst({
        matchDate: '2026-07-19',
        kickoffAt: '2026-07-19T15:00:00-04:00',
      }),
    ).toBe('7/20(月)');
  });

  it('準決勝(会場ローカル 7/14 14:00 CDT)は JST の 7/15(水) を返す', () => {
    expect(
      formatMatchDateJst({
        matchDate: '2026-07-14',
        kickoffAt: '2026-07-14T14:00:00-05:00',
      }),
    ).toBe('7/15(水)');
  });

  it('R32 初戦(会場ローカル 6/28 12:00 PDT)は JST の 6/29(月) を返す', () => {
    expect(
      formatMatchDateJst({
        matchDate: '2026-06-28',
        kickoffAt: '2026-06-28T12:00:00-07:00',
      }),
    ).toBe('6/29(月)');
  });

  it('kickoffAt が null のときは会場ローカル matchDate にフォールバックする', () => {
    expect(
      formatMatchDateJst({ matchDate: '2026-06-28', kickoffAt: null }),
    ).toBe('6/28(日)');
  });
});

describe('formatSlotLabel', () => {
  it('translates "Winner match NN" to "勝者 #NN"', () => {
    expect(formatSlotLabel('Winner match 73')).toBe('勝者 #73');
    expect(formatSlotLabel('Winner match 101')).toBe('勝者 #101');
  });

  it('translates "Runner-up match NN" to "敗者 #NN"', () => {
    expect(formatSlotLabel('Runner-up match 101')).toBe('敗者 #101');
  });

  it('translates "Group X winners" to "X 1位"（グループ語は省略）', () => {
    expect(formatSlotLabel('Group A winners')).toBe('A 1位');
    expect(formatSlotLabel('Group L winners')).toBe('L 1位');
  });

  it('translates "Group X runners-up" to "X 2位"', () => {
    expect(formatSlotLabel('Group B runners-up')).toBe('B 2位');
  });

  it('translates third place slots to "X/Y/Z 3位"', () => {
    expect(formatSlotLabel('Group C/D/F/G/H third place')).toBe('C/D/F/G/H 3位');
    expect(formatSlotLabel('Group A/B/C/D/F third place')).toBe('A/B/C/D/F 3位');
  });

  it('returns the input unchanged when no pattern matches', () => {
    expect(formatSlotLabel('未確定')).toBe('未確定');
    expect(formatSlotLabel('')).toBe('');
  });

  it('uses the supplied dictionary (en) instead of the default (ja)', () => {
    expect(formatSlotLabel('Winner match 73', en.match.slot)).toBe('Winner #73');
    expect(formatSlotLabel('Group A winners', en.match.slot)).toBe('A 1st');
    expect(formatSlotLabel('Group A/B/C/D/F third place', en.match.slot)).toBe('A/B/C/D/F 3rd');
  });
});

describe('formatSlotTitle', () => {
  it('ホバー用に全文（グループ語あり）を返す', () => {
    expect(formatSlotTitle('Group A winners')).toBe('グループA 1位');
    expect(formatSlotTitle('Group B runners-up')).toBe('グループB 2位');
    expect(formatSlotTitle('Group A/B/C/D/F third place')).toBe(
      'グループ A/B/C/D/F のいずれかの3位',
    );
  });

  it('勝者/敗者は試合番号付きの全文', () => {
    expect(formatSlotTitle('Winner match 89')).toBe('第89試合の勝者');
    expect(formatSlotTitle('Runner-up match 90')).toBe('第90試合の敗者');
  });

  it('uses the supplied dictionary (en) for the full label', () => {
    expect(formatSlotTitle('Winner match 89', en.match.slot)).toBe('Winner of match 89');
    expect(formatSlotTitle('Group A winners', en.match.slot)).toBe('Group A winners');
  });
});

describe('isWinner', () => {
  it('returns true when both ids match', () => {
    expect(isWinner('jpn', 'jpn')).toBe(true);
  });

  it('returns false when ids do not match or are null', () => {
    expect(isWinner('jpn', 'arg')).toBe(false);
    expect(isWinner(null, 'jpn')).toBe(false);
    expect(isWinner('jpn', null)).toBe(false);
    expect(isWinner(null, null)).toBe(false);
  });
});

describe('formatKickoffJst', () => {
  it('converts US Eastern (EDT -04:00) night kickoff to next-day JST morning', () => {
    // 2026-06-29 20:00 EDT = 2026-06-30 00:00 UTC = 2026-06-30 09:00 JST
    expect(formatKickoffJst('2026-06-29T20:00:00-04:00')).toBe('09:00');
  });

  it('converts US Pacific (PDT -07:00) evening kickoff to next-day JST morning', () => {
    // 2026-06-28 18:00 PDT = 2026-06-29 01:00 UTC = 2026-06-29 10:00 JST
    expect(formatKickoffJst('2026-06-28T18:00:00-07:00')).toBe('10:00');
  });

  it('converts Mexico City (-06:00 no DST) night kickoff to next-day JST noon', () => {
    // 2026-06-30 21:00 -06:00 = 2026-07-01 03:00 UTC = 2026-07-01 12:00 JST
    expect(formatKickoffJst('2026-06-30T21:00:00-06:00')).toBe('12:00');
  });

  it('returns null for null input', () => {
    expect(formatKickoffJst(null)).toBeNull();
  });

  it('returns null for invalid ISO string', () => {
    expect(formatKickoffJst('not-a-date')).toBeNull();
    expect(formatKickoffJst('')).toBeNull();
  });
});

describe('getParticipantLabel', () => {
  it('returns Japanese name only when team exists (flag is rendered separately)', () => {
    const label = getParticipantLabel(
      {
        id: 'jpn',
        nameJa: '日本',
        nameEn: 'Japan',
        fifaCode: 'JPN',
        flag: '🇯🇵',
        groupName: 'Group A',
      },
      'Group A runners-up',
    );

    expect(label).toBe('日本');
  });

  it('falls back to translated slot label when team is null', () => {
    expect(getParticipantLabel(null, 'Group A runners-up')).toBe('A 2位');
    expect(getParticipantLabel(null, 'Winner match 73')).toBe('勝者 #73');
  });
});
