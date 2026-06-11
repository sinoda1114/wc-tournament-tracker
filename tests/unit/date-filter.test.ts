import { describe, expect, it } from 'vitest';

import {
  dayAfterTomorrowJst,
  filterMatchesByDate,
  parseDateParam,
  serializeDateParam,
  toJstYmd,
  todayJst,
  tomorrowJst,
  type DateFilterValue,
} from '@/lib/date-filter';

describe('todayJst', () => {
  it('JST 20:00 はその日付を返す', () => {
    expect(todayJst(new Date('2026-06-11T20:00:00+09:00'))).toBe('2026-06-11');
  });

  it('UTC 00:00 はJST 09:00 で同日付を返す', () => {
    expect(todayJst(new Date('2026-06-11T00:00:00Z'))).toBe('2026-06-11');
  });

  it('UTC 14:59 (JST 23:59) は前日のまま', () => {
    expect(todayJst(new Date('2026-06-10T14:59:59Z'))).toBe('2026-06-10');
  });

  it('UTC 15:00 (JST 翌日 00:00) で日付が繰り上がる', () => {
    expect(todayJst(new Date('2026-06-10T15:00:00Z'))).toBe('2026-06-11');
  });

  it('年・月の境界でも JST 基準で繰り上がる', () => {
    expect(todayJst(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01');
    expect(todayJst(new Date('2026-06-30T15:00:00Z'))).toBe('2026-07-01');
  });
});

describe('tomorrowJst', () => {
  it('JST 基準の翌日を返す', () => {
    expect(tomorrowJst(new Date('2026-06-11T20:00:00+09:00'))).toBe('2026-06-12');
  });

  it('UTC 15:00 直後でも翌日（の翌日）を返す', () => {
    expect(tomorrowJst(new Date('2026-06-10T15:00:00Z'))).toBe('2026-06-12');
  });

  it('月末を跨いで翌月 1 日を返す', () => {
    expect(tomorrowJst(new Date('2026-06-30T12:00:00+09:00'))).toBe('2026-07-01');
  });
});

describe('dayAfterTomorrowJst', () => {
  it('JST 基準の明後日を返す', () => {
    expect(dayAfterTomorrowJst(new Date('2026-06-11T20:00:00+09:00'))).toBe('2026-06-13');
  });

  it('UTC 15:00 直後でも明後日に正しく繰り上がる', () => {
    expect(dayAfterTomorrowJst(new Date('2026-06-10T15:00:00Z'))).toBe('2026-06-13');
  });

  it('年末を跨いで来年 1/2 を返す', () => {
    expect(dayAfterTomorrowJst(new Date('2026-12-31T20:00:00+09:00'))).toBe('2027-01-02');
  });
});

describe('parseDateParam', () => {
  it('正しい YYYY-MM-DD は date kind になる', () => {
    expect(parseDateParam('2026-06-11')).toEqual({ kind: 'date', date: '2026-06-11' });
  });

  it('null は all', () => {
    expect(parseDateParam(null)).toEqual({ kind: 'all' });
  });

  it('undefined は all', () => {
    expect(parseDateParam(undefined)).toEqual({ kind: 'all' });
  });

  it('空文字は all', () => {
    expect(parseDateParam('')).toEqual({ kind: 'all' });
  });

  it('形式不正は all', () => {
    expect(parseDateParam('invalid')).toEqual({ kind: 'all' });
    expect(parseDateParam('2026/06/11')).toEqual({ kind: 'all' });
    expect(parseDateParam('06-11-2026')).toEqual({ kind: 'all' });
  });

  it('範囲外の月日は all（カレンダー実在チェック）', () => {
    expect(parseDateParam('2026-13-50')).toEqual({ kind: 'all' });
    expect(parseDateParam('2026-02-30')).toEqual({ kind: 'all' });
    expect(parseDateParam('2026-00-10')).toEqual({ kind: 'all' });
    expect(parseDateParam('2026-06-32')).toEqual({ kind: 'all' });
  });

  it('うるう年でない 2 月 29 日は all', () => {
    expect(parseDateParam('2025-02-29')).toEqual({ kind: 'all' });
  });

  it('うるう年の 2 月 29 日は date kind', () => {
    expect(parseDateParam('2024-02-29')).toEqual({ kind: 'date', date: '2024-02-29' });
  });
});

describe('serializeDateParam', () => {
  it('all は null（クエリから削除する想定）', () => {
    expect(serializeDateParam({ kind: 'all' })).toBeNull();
  });

  it('date はそのまま文字列', () => {
    expect(serializeDateParam({ kind: 'date', date: '2026-06-12' })).toBe('2026-06-12');
  });
});

describe('toJstYmd', () => {
  it('米東部の夜キックオフ(7/19 15:00 ET)は JST で翌日(7/20)', () => {
    expect(toJstYmd('2026-07-19T15:00:00-04:00')).toBe('2026-07-20');
  });

  it('米太平洋の昼キックオフ(6/28 12:00 PDT)は JST で翌日(6/29)', () => {
    expect(toJstYmd('2026-06-28T12:00:00-07:00')).toBe('2026-06-29');
  });

  it('null/undefined/不正値は null を返す', () => {
    expect(toJstYmd(null)).toBeNull();
    expect(toJstYmd(undefined)).toBeNull();
    expect(toJstYmd('not-a-date')).toBeNull();
  });
});

describe('filterMatchesByDate', () => {
  const matches = [
    { id: 1, matchDate: '2026-06-11' },
    { id: 2, matchDate: '2026-06-12' },
    { id: 3, matchDate: '2026-06-12' },
    { id: 4, matchDate: '2026-06-13' },
  ];

  it('all のときは全件返す', () => {
    const filter: DateFilterValue = { kind: 'all' };
    expect(filterMatchesByDate(matches, filter)).toHaveLength(4);
  });

  it('date 指定で該当する試合だけ返す（kickoffAt 無しは matchDate 基準）', () => {
    const filter: DateFilterValue = { kind: 'date', date: '2026-06-12' };
    const result = filterMatchesByDate(matches, filter);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual([2, 3]);
  });

  it('該当 0 件は空配列', () => {
    const filter: DateFilterValue = { kind: 'date', date: '2026-06-15' };
    expect(filterMatchesByDate(matches, filter)).toEqual([]);
  });

  it('空配列を渡しても安全に空配列を返す', () => {
    expect(filterMatchesByDate([], { kind: 'all' })).toEqual([]);
    expect(filterMatchesByDate([], { kind: 'date', date: '2026-06-12' })).toEqual([]);
  });

  it('kickoffAt があるときは JST 暦日で絞り込む（会場ローカルの翌日でヒット）', () => {
    // 会場ローカル matchDate=7/19 だが JST では 7/20。JST 基準でフィルタする。
    const withKickoff = [
      { id: 104, matchDate: '2026-07-19', kickoffAt: '2026-07-19T15:00:00-04:00' },
      { id: 103, matchDate: '2026-07-18', kickoffAt: '2026-07-18T17:00:00-04:00' },
    ];
    // JST 7/20 で決勝(104)がヒットし、会場ローカルの 7/19 ではヒットしない。
    expect(
      filterMatchesByDate(withKickoff, { kind: 'date', date: '2026-07-20' }).map((m) => m.id),
    ).toEqual([104]);
    expect(
      filterMatchesByDate(withKickoff, { kind: 'date', date: '2026-07-19' }).map((m) => m.id),
    ).toEqual([103]);
  });
});

describe('parseDatesParam (複数日)', () => {
  it('カンマ区切りを配列で返す（重複除去・昇順）', async () => {
    const { parseDatesParam } = await import('@/lib/date-filter');
    expect(parseDatesParam('2026-06-19,2026-06-18,2026-06-19')).toEqual([
      '2026-06-18',
      '2026-06-19',
    ]);
  });

  it('単一日も配列で返す', async () => {
    const { parseDatesParam } = await import('@/lib/date-filter');
    expect(parseDatesParam('2026-06-11')).toEqual(['2026-06-11']);
  });

  it('不正な日付は捨てて有効分のみ返す', async () => {
    const { parseDatesParam } = await import('@/lib/date-filter');
    expect(parseDatesParam('invalid,2026-06-18,2026-13-50')).toEqual(['2026-06-18']);
  });

  it('null/空文字は空配列', async () => {
    const { parseDatesParam } = await import('@/lib/date-filter');
    expect(parseDatesParam(null)).toEqual([]);
    expect(parseDatesParam('')).toEqual([]);
  });

  it('上限14日で切り詰める', async () => {
    const { parseDatesParam } = await import('@/lib/date-filter');
    const many = Array.from({ length: 20 }, (_, i) =>
      `2026-06-${String(i + 1).padStart(2, '0')}`,
    ).join(',');
    expect(parseDatesParam(many)).toHaveLength(14);
  });
});

describe('serializeDatesParam', () => {
  it('配列をカンマ区切りへ・空はnull', async () => {
    const { serializeDatesParam } = await import('@/lib/date-filter');
    expect(serializeDatesParam(['2026-06-18', '2026-06-19'])).toBe('2026-06-18,2026-06-19');
    expect(serializeDatesParam([])).toBeNull();
  });
});

describe('filterMatchesByDates', () => {
  it('複数日のいずれかに一致する試合を返す', async () => {
    const { filterMatchesByDates } = await import('@/lib/date-filter');
    const ms = [
      { matchDate: '2026-06-18', kickoffAt: null },
      { matchDate: '2026-06-19', kickoffAt: null },
      { matchDate: '2026-06-20', kickoffAt: null },
    ];
    expect(filterMatchesByDates(ms, ['2026-06-18', '2026-06-20'])).toHaveLength(2);
    expect(filterMatchesByDates(ms, [])).toHaveLength(3);
  });
});
