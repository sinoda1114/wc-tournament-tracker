import 'server-only';

import { getWeatherSnapshot, upsertWeatherSnapshot } from '@/db/weather-snapshots';

import { fetchForecast, fetchHistory } from './client';
import { getVenueCoordinate } from './coordinates';
import {
  forecastReferenceDate,
  isWithinForecastWindow,
  isWithinHistoryWindow,
  parseForecastForDate,
  shouldPersistForecastSnapshot,
} from './forecast';
import type { WeatherForecast } from './types';

/**
 * 会場 id と試合日（YYYY-MM-DD）から天気予報を返す。
 * - 予報ウィンドウ外（3日より先）/ 座標未登録 / 取得失敗 → null（呼び出し側で非表示）。
 * 取得データは表示言語に依らず共通（天候テキストの日本語化は呼び出し側でコードから行う）。
 */
export async function getVenueWeather(
  matchId: number,
  venueId: string,
  matchDate: string,
  kickoffAt: string | null = null,
  now: Date = new Date(),
): Promise<WeatherForecast | null> {
  const snapshot = await getWeatherSnapshot(matchId).catch(() => null);
  if (snapshot) {
    return snapshot;
  }

  const coord = getVenueCoordinate(venueId);
  if (!coord) {
    return null;
  }

  const referenceDate = forecastReferenceDate(now, kickoffAt);
  const source = isWithinForecastWindow(matchDate, referenceDate)
    ? 'forecast'
    : isWithinHistoryWindow(matchDate, referenceDate)
      ? 'history'
      : null;
  if (!source) {
    return null;
  }

  const payload =
    source === 'forecast'
      ? await fetchForecast(coord)
      : await fetchHistory(coord, matchDate);
  if (!payload) {
    return null;
  }
  const weather = parseForecastForDate(payload, matchDate);
  if (!weather) {
    return null;
  }

  const shouldPersist =
    source === 'history' || shouldPersistForecastSnapshot(kickoffAt, now);
  if (shouldPersist) {
    await upsertWeatherSnapshot({ matchId, weather, source }).catch(() => undefined);
  }
  return weather;
}

export type { WeatherForecast } from './types';
