import type { WeatherForecast } from '@/lib/weather/types';

import { getDb } from './client';

const db = () => getDb();

export type WeatherSnapshotSource = 'forecast' | 'history' | 'manual';

export type WeatherSnapshot = WeatherForecast & {
  matchId: number;
  source: WeatherSnapshotSource;
  sourceUrl: string | null;
  capturedAt: string;
  updatedAt: string;
};

type WeatherSnapshotRow = {
  match_id: number;
  weather_date: string;
  source: WeatherSnapshotSource;
  max_temp_c: number;
  min_temp_c: number;
  condition_code: number;
  condition_text: string;
  condition_icon_url: string;
  chance_of_rain: number;
  source_url: string | null;
  captured_at: string;
  updated_at: string;
};

export type UpsertWeatherSnapshotInput = {
  matchId: number;
  weather: WeatherForecast;
  source: WeatherSnapshotSource;
  sourceUrl?: string | null;
};

function mapWeatherSnapshot(row: WeatherSnapshotRow): WeatherSnapshot {
  return {
    matchId: Number(row.match_id),
    date: row.weather_date,
    source: row.source,
    maxTempC: Number(row.max_temp_c),
    minTempC: Number(row.min_temp_c),
    conditionCode: Number(row.condition_code),
    conditionText: row.condition_text,
    conditionIconUrl: row.condition_icon_url,
    chanceOfRain: Number(row.chance_of_rain),
    sourceUrl: row.source_url,
    capturedAt: row.captured_at,
    updatedAt: row.updated_at,
  };
}

export async function getWeatherSnapshot(matchId: number): Promise<WeatherSnapshot | null> {
  const result = await db().execute({
    sql: `
      SELECT
        match_id,
        weather_date,
        source,
        max_temp_c,
        min_temp_c,
        condition_code,
        condition_text,
        condition_icon_url,
        chance_of_rain,
        source_url,
        captured_at,
        updated_at
      FROM match_weather_snapshots
      WHERE match_id = ?
    `,
    args: [matchId],
  });

  const row = result.rows[0] as unknown as WeatherSnapshotRow | undefined;
  return row ? mapWeatherSnapshot(row) : null;
}

export async function upsertWeatherSnapshot({
  matchId,
  weather,
  source,
  sourceUrl = null,
}: UpsertWeatherSnapshotInput): Promise<void> {
  await db().execute({
    sql: `
      INSERT INTO match_weather_snapshots (
        match_id,
        weather_date,
        source,
        max_temp_c,
        min_temp_c,
        condition_code,
        condition_text,
        condition_icon_url,
        chance_of_rain,
        source_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(match_id) DO UPDATE SET
        weather_date = excluded.weather_date,
        source = excluded.source,
        max_temp_c = excluded.max_temp_c,
        min_temp_c = excluded.min_temp_c,
        condition_code = excluded.condition_code,
        condition_text = excluded.condition_text,
        condition_icon_url = excluded.condition_icon_url,
        chance_of_rain = excluded.chance_of_rain,
        source_url = excluded.source_url,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `,
    args: [
      matchId,
      weather.date,
      source,
      weather.maxTempC,
      weather.minTempC,
      weather.conditionCode,
      weather.conditionText,
      weather.conditionIconUrl,
      weather.chanceOfRain,
      sourceUrl,
    ],
  });
}
