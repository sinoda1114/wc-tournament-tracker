import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { resetDbForTesting, setDbForTesting } from '@/db/client';
import {
  getWeatherSnapshot,
  upsertWeatherSnapshot,
} from '@/db/weather-snapshots';

let testClient: Client;

const MIGRATIONS_DIR = resolve(process.cwd(), 'src/db/migrations');

async function runMigrations(client: Client) {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await client.execute(stmt);
    }
  }
}

async function resetFixtures(client: Client) {
  await client.execute('DELETE FROM match_weather_snapshots');
  await client.execute('DELETE FROM matches');
  await client.execute('DELETE FROM venues');

  await client.execute({
    sql: `INSERT INTO venues (id, stadium_name, city, state, country, country_code, country_flag)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['toronto', 'BMO Field', 'Toronto', 'Ontario', 'Canada', 'CAN', '🇨🇦'],
  });
  await client.execute({
    sql: `INSERT INTO matches (id, stage, match_date, kickoff_at, venue_id, home_slot, away_slot, status, group_letter)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [21, 'group_stage', '2026-06-17', '2026-06-17T19:00:00-04:00', 'toronto', 'L3', 'L4', 'scheduled', 'L'],
  });
}

beforeAll(async () => {
  testClient = createClient({ url: ':memory:' });
  setDbForTesting(testClient);
  await runMigrations(testClient);
});

afterAll(() => {
  resetDbForTesting();
});

beforeEach(async () => {
  await resetFixtures(testClient);
});

describe('weather snapshots', () => {
  it('試合ごとの天気スナップショットを保存して読み戻せる', async () => {
    await upsertWeatherSnapshot({
      matchId: 21,
      source: 'history',
      weather: {
        date: '2026-06-17',
        maxTempC: 24.4,
        minTempC: 16.2,
        conditionCode: 1003,
        conditionText: 'Partly cloudy',
        conditionIconUrl: 'https://cdn.weatherapi.com/weather/64x64/day/116.png',
        chanceOfRain: 20,
      },
    });

    const snapshot = await getWeatherSnapshot(21);
    expect(snapshot).toMatchObject({
      matchId: 21,
      date: '2026-06-17',
      source: 'history',
      maxTempC: 24.4,
      minTempC: 16.2,
      conditionCode: 1003,
      conditionText: 'Partly cloudy',
      conditionIconUrl: 'https://cdn.weatherapi.com/weather/64x64/day/116.png',
      chanceOfRain: 20,
    });
  });

  it('同じ試合の保存は上書きされる', async () => {
    await upsertWeatherSnapshot({
      matchId: 21,
      source: 'forecast',
      weather: {
        date: '2026-06-17',
        maxTempC: 22,
        minTempC: 14,
        conditionCode: 1000,
        conditionText: 'Sunny',
        conditionIconUrl: '',
        chanceOfRain: 0,
      },
    });

    await upsertWeatherSnapshot({
      matchId: 21,
      source: 'manual',
      sourceUrl: 'https://example.com/weather',
      weather: {
        date: '2026-06-17',
        maxTempC: 23,
        minTempC: 15,
        conditionCode: 1183,
        conditionText: 'Light rain',
        conditionIconUrl: '',
        chanceOfRain: 60,
      },
    });

    const snapshot = await getWeatherSnapshot(21);
    expect(snapshot?.source).toBe('manual');
    expect(snapshot?.sourceUrl).toBe('https://example.com/weather');
    expect(snapshot?.conditionText).toBe('Light rain');
    expect(snapshot?.chanceOfRain).toBe(60);
  });
});
