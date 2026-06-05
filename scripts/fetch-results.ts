import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

import { listAllTeams, listTournamentMatches, updateMatchResult } from '../src/db/queries';
import { planMatchUpdates } from '../src/lib/ingest/reconcile';
import { createTheSportsDbProvider } from '../src/lib/ingest/thesportsdb';

// 既定は dry-run（DBに書かない）。`--apply` で実反映する。
async function main() {
  const apply = process.argv.includes('--apply');

  const provider = createTheSportsDbProvider();
  const results = await provider.fetchResults();
  const finished = results.filter((r) => r.finished).length;
  console.log(`fetched ${results.length} events (finished=${finished})`);

  const [matches, teams] = await Promise.all([
    listTournamentMatches(),
    listAllTeams(),
  ]);
  const updates = planMatchUpdates(results, matches, teams);
  console.log(`planned updates: ${updates.length}`);
  if (updates.length > 0) console.table(updates);

  if (!apply) {
    console.log('dry-run（書き込みなし）。実反映するには --apply を付けて再実行。');
    return;
  }

  for (const update of updates) {
    await updateMatchResult(update);
  }
  console.log(`applied ${updates.length} updates`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
