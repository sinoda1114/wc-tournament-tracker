import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

import { upsertWeatherSnapshot } from '../src/db/weather-snapshots';

const snapshotSchema = z.object({
  matchId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxTempC: z.number(),
  minTempC: z.number(),
  conditionCode: z.number().int().optional().default(0),
  conditionText: z.string().optional().default(''),
  conditionIconUrl: z.string().optional().default(''),
  chanceOfRain: z.number().int().min(0).max(100).optional().default(0),
  sourceUrl: z.string().optional(),
});

const inputSchema = z.array(snapshotSchema).min(1);

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error(
      '使い方: npm run weather:import-snapshots -- <snapshots.json>\n' +
        '例: [{"matchId":1,"date":"2026-06-11","maxTempC":24,"minTempC":17,"conditionText":"Partly cloudy","chanceOfRain":20}]',
    );
    process.exitCode = 1;
    return;
  }

  const rows = inputSchema.parse(JSON.parse(readFileSync(resolve(file), 'utf8')));
  for (const row of rows) {
    await upsertWeatherSnapshot({
      matchId: row.matchId,
      source: 'manual',
      sourceUrl: row.sourceUrl,
      weather: {
        date: row.date,
        maxTempC: row.maxTempC,
        minTempC: row.minTempC,
        conditionCode: row.conditionCode,
        conditionText: row.conditionText,
        conditionIconUrl: row.conditionIconUrl,
        chanceOfRain: row.chanceOfRain,
      },
    });
  }

  console.log(`imported ${rows.length} weather snapshot(s)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
