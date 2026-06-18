import 'server-only';

import { fetchForecast } from './client';
import { getVenueCoordinate } from './coordinates';
import { forecastReferenceDate, isWithinForecastWindow, parseForecastForDate } from './forecast';
import type { WeatherForecast } from './types';

/**
 * 会場 id と試合日（YYYY-MM-DD）から天気予報を返す。
 * - 予報ウィンドウ外（3日より先）/ 座標未登録 / 取得失敗 → null（呼び出し側で非表示）。
 * 取得データは表示言語に依らず共通（天候テキストの日本語化は呼び出し側でコードから行う）。
 */
export async function getVenueWeather(
  venueId: string,
  matchDate: string,
  kickoffAt: string | null = null,
  now: Date = new Date(),
): Promise<WeatherForecast | null> {
  if (!isWithinForecastWindow(matchDate, forecastReferenceDate(now, kickoffAt))) {
    return null;
  }
  const coord = getVenueCoordinate(venueId);
  if (!coord) {
    return null;
  }
  const payload = await fetchForecast(coord);
  if (!payload) {
    return null;
  }
  return parseForecastForDate(payload, matchDate);
}

export type { WeatherForecast } from './types';
