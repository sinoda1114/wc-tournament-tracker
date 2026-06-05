import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

import { getDb } from '../src/db/client';

async function check() {
  const tables = ['teams', 'venues', 'matches', 'bracket_edges'] as const;

  for (const table of tables) {
    const result = await getDb().execute(`SELECT COUNT(*) AS count FROM ${table}`);
    console.log(`${table.padEnd(15)} ${result.rows[0].count}`);
  }

  const stageResult = await getDb().execute(
    'SELECT stage, COUNT(*) AS count FROM matches GROUP BY stage ORDER BY MIN(id)',
  );
  console.log('\nmatches by stage');
  for (const row of stageResult.rows) {
    console.log(`  ${String(row.stage).padEnd(14)} ${row.count}`);
  }

  const edgeResult = await getDb().execute(
    'SELECT from_result, COUNT(*) AS count FROM bracket_edges GROUP BY from_result',
  );
  console.log('\nbracket_edges by from_result');
  for (const row of edgeResult.rows) {
    console.log(`  ${String(row.from_result).padEnd(8)} ${row.count}`);
  }
}

check().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
