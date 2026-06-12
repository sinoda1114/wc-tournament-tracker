import { replaceAutoMatchEvents } from '@/db/match-events';
import { listAllTeams, listTournamentMatches, updateMatchResult } from '@/db/queries';
import { resolveAndPersistRoundOf32 } from '@/db/queries/round-of-32';

import { planMatchEventSyncs, planMatchUpdates, toAutoMatchEvents } from './reconcile';
import type { MatchEventProvider, ResultProvider } from './types';

export type IngestionFailure = {
  /** 反映に失敗した試合 id。 */
  matchId: number;
  /** 失敗理由（ログ/監視用）。 */
  message: string;
};

/** イベントタイムライン同期の集約結果（取込の可視化用）。 */
export type MatchEventsSummary = {
  /** タイムライン取得を試みた試合数。 */
  planned: number;
  /** auto イベントの置き換えまで成功した試合数。 */
  synced: number;
  /** 挿入したイベント総数（無料キーでは約5件/試合に切り詰められる）。 */
  inserted: number;
  /** タイムラインが空/欠落で置き換えを見送った試合数（既存 auto は保持）。 */
  empty: number;
  /** 試合ごとの取込イベント件数（空・欠落も 0 件として可視化）。 */
  perMatch: { matchId: number; count: number }[];
  /** 同期に失敗した試合（スコア反映の成否には影響しない）。 */
  failures: IngestionFailure[];
};

export type IngestionSummary = {
  /** 取得元から得たイベント総数。 */
  fetched: number;
  /** 反映を試みた（=突き合わせで更新対象になった）試合数。 */
  planned: number;
  /** 実際に DB 更新が成功した試合数。 */
  updated: number;
  /** 更新に成功した試合 id（確認用）。 */
  matchIds: number[];
  /** 反映に失敗した試合（部分失敗）。空なら全件成功。 */
  failures: IngestionFailure[];
  /** グループ順位確定で R32 入口（home/away_team_id）を埋めたスロット数。 */
  roundOf32Updated: number;
  /** イベントタイムライン同期の集約。provider 非対応時は全て 0。 */
  events: MatchEventsSummary;
};

/**
 * 取得元 → 正規化 → 突き合わせ → DB反映 を一括実行する。
 * 書き込みは既存 `updateMatchResult` を使うため、勝者解決とブラケット伝播が一貫する。
 * 取得元は引数で差し替え可能（テスト時はモック provider を渡せる）。
 *
 * 堅牢化:
 * - 冪等性は planMatchUpdates が担保（同結果ならそもそも更新対象に入らない）。
 *   そのため cron 多重起動・再実行で重複適用にならない。
 * - 部分失敗耐性: 1 試合の反映が失敗しても残りは継続し、失敗は summary.failures に集約する
 *   （1 件の不整合で全取込が止まらないようにする）。手入力フォールバックは従来どおり有効。
 * - fetchResults 自体（ネットワーク失敗）は呼び出し側に投げて 500 とし、cron の再試行に委ねる。
 */
export async function runIngestion(
  provider: ResultProvider & Partial<MatchEventProvider>,
): Promise<IngestionSummary> {
  const [results, matches, teams] = await Promise.all([
    provider.fetchResults(),
    listTournamentMatches(),
    listAllTeams(),
  ]);

  const updates = planMatchUpdates(results, matches, teams);

  const matchIds: number[] = [];
  const failures: IngestionFailure[] = [];
  for (const update of updates) {
    try {
      await updateMatchResult(update);
      matchIds.push(update.matchId);
    } catch (error) {
      failures.push({
        matchId: update.matchId,
        message: error instanceof Error ? error.message : 'update failed',
      });
    }
  }

  // グループ結果が入ったら、順位表から R32 入口（home/away_team_id）を埋める。
  // 冪等（確定済み・変化なしは 0 更新）。R32 解決の失敗は取込成功を覆さない。
  let roundOf32Updated = 0;
  if (matchIds.length > 0) {
    try {
      const r32 = await resolveAndPersistRoundOf32();
      roundOf32Updated = r32.updated;
    } catch (error) {
      console.error('[ingest] R32 解決に失敗', error);
    }
  }

  // イベントタイムライン同期（任意機能）。
  // - スコア更新と独立に計画する（手入力済み試合のイベント補完にも効く）。
  // - 空タイムラインは既存 auto を消さずスキップ（無料キーの欠落で蓄積を失わない）。
  // - 失敗は events.failures に集約し、スコア反映の成功を覆さない。
  const events: MatchEventsSummary = {
    planned: 0,
    synced: 0,
    inserted: 0,
    empty: 0,
    perMatch: [],
    failures: [],
  };
  if (typeof provider.fetchMatchEvents === 'function') {
    const syncs = planMatchEventSyncs(results, matches, teams);
    events.planned = syncs.length;
    for (const sync of syncs) {
      try {
        const normalized = await provider.fetchMatchEvents(sync);
        const auto = toAutoMatchEvents(normalized, sync);
        if (auto.length === 0) {
          events.empty += 1;
          events.perMatch.push({ matchId: sync.matchId, count: 0 });
          continue;
        }
        await replaceAutoMatchEvents(sync.matchId, auto);
        events.synced += 1;
        events.inserted += auto.length;
        events.perMatch.push({ matchId: sync.matchId, count: auto.length });
      } catch (error) {
        events.failures.push({
          matchId: sync.matchId,
          message: error instanceof Error ? error.message : 'event sync failed',
        });
      }
    }
  }

  return {
    fetched: results.length,
    planned: updates.length,
    updated: matchIds.length,
    matchIds,
    failures,
    roundOf32Updated,
    events,
  };
}
