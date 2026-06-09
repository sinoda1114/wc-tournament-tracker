import 'server-only';

import { fetchForecast } from './client';
import { getVenueCoordinate } from './coordinates';
import { isWithinForecastWindow, parseForecastForDate } from './forecast';
import type { WeatherForecast } from './types';

/** YYYY-MM-DD の当日（UTC 暦日）。 */
function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * 会場 id と試合日（YYYY-MM-DD）から天気予報を返す。
 * - 予報ウィンドウ外（3日より先）/ 座標未登録 / 取得失敗 → null（呼び出し側で非表示）。
 * locale は WeatherAPI の天候テキストのローカライズに使う。
 */
export async function getVenueWeather(
  venueId: string,
  matchDate: string,
  locale: string,
  now: Date = new Date(),
): Promise<WeatherForecast | null> {
  if (!isWithinForecastWindow(matchDate, todayUtc(now))) {
    return null;
  }
  const coord = getVenueCoordinate(venueId);
  if (!coord) {
    return null;
  }
  const payload = await fetchForecast(coord, locale);
  if (!payload) {
    return null;
  }
  return parseForecastForDate(payload, matchDate);
}

export type { WeatherForecast } from './types';
