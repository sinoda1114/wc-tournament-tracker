import { listAllTeams, listTournamentMatches, updateMatchResult } from '@/db/queries';

import { planMatchUpdates } from './reconcile';
import type { ResultProvider } from './types';

export type IngestionSummary = {
  /** 取得元から得たイベント総数。 */
  fetched: number;
  /** 実際に DB を更新した試合数。 */
  updated: number;
  /** 更新した試合 id（確認用）。 */
  matchIds: number[];
};

/**
 * 取得元 → 正規化 → 突き合わせ → DB反映 を一括実行する。
 * 書き込みは既存 `updateMatchResult` を使うため、勝者解決とブラケット伝播が一貫する。
 * 取得元は引数で差し替え可能（テスト時はモック provider を渡せる）。
 */
export async function runIngestion(
  provider: ResultProvider,
): Promise<IngestionSummary> {
  const [results, matches, teams] = await Promise.all([
    provider.fetchResults(),
    listTournamentMatches(),
    listAllTeams(),
  ]);

  const updates = planMatchUpdates(results, matches, teams);
  for (const update of updates) {
    await updateMatchResult(update);
  }

  return {
    fetched: results.length,
    updated: updates.length,
    matchIds: updates.map((u) => u.matchId),
  };
}
