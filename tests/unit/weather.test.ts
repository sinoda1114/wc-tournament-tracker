import { describe, expect, it } from 'vitest';

import { VENUE_COORDINATES, getVenueCoordinate } from '@/lib/weather/coordinates';
import {
  FORECAST_WINDOW_DAYS,
  HISTORY_WINDOW_DAYS,
  forecastReferenceDate,
  isWithinHistoryWindow,
  isWithinForecastWindow,
  normalizeIconUrl,
  parseForecastForDate,
  shouldPersistForecastSnapshot,
  todayUtc,
} from '@/lib/weather/forecast';

describe('getVenueCoordinate', () => {
  it('全16会場の座標を持つ', () => {
    expect(Object.keys(VENUE_COORDINATES)).toHaveLength(16);
  });

  it('既知の会場 id で座標を返す', () => {
    const coord = getVenueCoordinate('new_york_new_jersey');
    expect(coord).not.toBeNull();
    expect(coord?.lat).toBeGreaterThan(40);
    expect(coord?.lat).toBeLessThan(41);
    expect(coord?.lon).toBeLessThan(-73);
  });

  it('未登録の会場 id では null を返す', () => {
    expect(getVenueCoordinate('unknown_venue')).toBeNull();
  });

  it('全座標が妥当な緯度経度の範囲に収まる', () => {
    for (const [id, c] of Object.entries(VENUE_COORDINATES)) {
      expect(c.lat, `${id} lat`).toBeGreaterThanOrEqual(-90);
      expect(c.lat, `${id} lat`).toBeLessThanOrEqual(90);
      expect(c.lon, `${id} lon`).toBeGreaterThanOrEqual(-180);
      expect(c.lon, `${id} lon`).toBeLessThanOrEqual(180);
    }
  });
});

describe('isWithinForecastWindow', () => {
  const today = '2026-06-11';

  it('当日は対象', () => {
    expect(isWithinForecastWindow('2026-06-11', today)).toBe(true);
  });

  it('予報ウィンドウ最終日（today+2）は対象', () => {
    expect(isWithinForecastWindow('2026-06-13', today)).toBe(true);
  });

  it('ウィンドウ外（today+3）は対象外', () => {
    expect(isWithinForecastWindow('2026-06-14', today)).toBe(false);
  });

  it('過去日は対象外', () => {
    expect(isWithinForecastWindow('2026-06-10', today)).toBe(false);
  });

  it('不正な日付文字列は false', () => {
    expect(isWithinForecastWindow('not-a-date', today)).toBe(false);
  });

  it('ウィンドウ日数は無料プランの3日', () => {
    expect(FORECAST_WINDOW_DAYS).toBe(3);
  });
});

describe('isWithinHistoryWindow', () => {
  const today = '2026-06-18';

  it('無料プランの過去1日は対象', () => {
    expect(isWithinHistoryWindow('2026-06-17', today)).toBe(true);
  });

  it('今日と2日前以前は対象外', () => {
    expect(isWithinHistoryWindow('2026-06-18', today)).toBe(false);
    expect(isWithinHistoryWindow('2026-06-16', today)).toBe(false);
  });

  it('ウィンドウ日数は無料プランの1日', () => {
    expect(HISTORY_WINDOW_DAYS).toBe(1);
  });
});

describe('forecastReferenceDate', () => {
  it('UTC の当日を返す', () => {
    expect(todayUtc(new Date('2026-06-18T00:02:00Z'))).toBe('2026-06-18');
  });

  it('北米夜の試合を日本時間翌朝に見ても会場側の日付で判定できる', () => {
    const now = new Date('2026-06-18T00:02:00Z');
    expect(forecastReferenceDate(now, '2026-06-17T19:00:00-04:00')).toBe('2026-06-17');
    expect(
      isWithinForecastWindow(
        '2026-06-17',
        forecastReferenceDate(now, '2026-06-17T19:00:00-04:00'),
      ),
    ).toBe(true);
  });

  it('kickoffAt が無い場合は UTC 当日にフォールバックする', () => {
    expect(forecastReferenceDate(new Date('2026-06-18T00:02:00Z'), null)).toBe('2026-06-18');
  });
});

describe('shouldPersistForecastSnapshot', () => {
  it('KO後だけ予報スナップショットを保存対象にする', () => {
    const now = new Date('2026-06-18T12:00:00Z');
    expect(shouldPersistForecastSnapshot('2026-06-18T11:59:00Z', now)).toBe(true);
    expect(shouldPersistForecastSnapshot('2026-06-18T12:01:00Z', now)).toBe(false);
  });

  it('KO時刻が無い・壊れている場合は保存しない', () => {
    const now = new Date('2026-06-18T12:00:00Z');
    expect(shouldPersistForecastSnapshot(null, now)).toBe(false);
    expect(shouldPersistForecastSnapshot('not-a-date', now)).toBe(false);
  });
});

describe('normalizeIconUrl', () => {
  it('先頭 // を https: で補う', () => {
    expect(normalizeIconUrl('//cdn.weatherapi.com/weather/64x64/day/353.png')).toBe(
      'https://cdn.weatherapi.com/weather/64x64/day/353.png',
    );
  });

  it('既に https の URL はそのまま', () => {
    expect(normalizeIconUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
  });

  it('空文字は空文字', () => {
    expect(normalizeIconUrl('')).toBe('');
  });
});

describe('parseForecastForDate', () => {
  const payload = {
    forecast: {
      forecastday: [
        {
          date: '2026-06-11',
          day: {
            maxtemp_c: 28.5,
            mintemp_c: 19.2,
            daily_chance_of_rain: 73,
            condition: {
              code: 1240,
              text: 'Light rain shower',
              icon: '//cdn.weatherapi.com/weather/64x64/day/353.png',
            },
          },
        },
        {
          date: '2026-06-12',
          day: {
            maxtemp_c: 30,
            mintemp_c: 20,
            daily_chance_of_rain: 0,
            condition: { text: 'Sunny', icon: '//cdn.weatherapi.com/weather/64x64/day/113.png' },
          },
        },
      ],
    },
  };

  it('指定日の予報を正規化して返す', () => {
    const result = parseForecastForDate(payload, '2026-06-11');
    expect(result).toEqual({
      date: '2026-06-11',
      maxTempC: 28.5,
      minTempC: 19.2,
      conditionCode: 1240,
      conditionText: 'Light rain shower',
      conditionIconUrl: 'https://cdn.weatherapi.com/weather/64x64/day/353.png',
      chanceOfRain: 73,
    });
  });

  it('該当日が無ければ null', () => {
    expect(parseForecastForDate(payload, '2026-06-20')).toBeNull();
  });

  it('気温欠落なら null', () => {
    const broken = {
      forecast: { forecastday: [{ date: '2026-06-11', day: { condition: { text: 'x', icon: '' } } }] },
    };
    expect(parseForecastForDate(broken, '2026-06-11')).toBeNull();
  });

  it('降水確率が無ければ 0 で補完', () => {
    const noRain = {
      forecast: {
        forecastday: [
          { date: '2026-06-11', day: { maxtemp_c: 25, mintemp_c: 15, condition: { text: 'Sunny', icon: '' } } },
        ],
      },
    };
    expect(parseForecastForDate(noRain, '2026-06-11')?.chanceOfRain).toBe(0);
  });

  it('null / 非オブジェクトは null', () => {
    expect(parseForecastForDate(null, '2026-06-11')).toBeNull();
    expect(parseForecastForDate('string', '2026-06-11')).toBeNull();
    expect(parseForecastForDate({}, '2026-06-11')).toBeNull();
  });
});
