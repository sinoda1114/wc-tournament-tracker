import { replaceAutoMatchEvents } from '@/db/match-events';
import { listAllTeams, listTournamentMatches, updateMatchResult } from '@/db/queries';
import { resolveAndPersistRoundOf32 } from '@/db/queries/round-of-32';

import { planMatchEventSyncs, planMatchUpdates, toAutoMatchEvents } from './reconcile';
import type {
  FallbackResultTarget,
  MatchEventProvider,
  ResultFallbackProvider,
  ResultProvider,
} from './types';

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
  /** 補完ソース（Wikipedia）で確定できた試合数（T-82③）。provider 非対応時は 0。 */
  fallbackUpdated: number;
  /** イベントタイムライン同期の集約。provider 非対応時は全て 0。 */
  events: MatchEventsSummary;
};

/** 'YYYY-MM-DD'（UTC）を返す。フォールバック対象（過去/当日の試合）の判定に使う。 */
function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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
  provider: ResultProvider & Partial<MatchEventProvider> & Partial<ResultFallbackProvider>,
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

  // 結果フォールバック（T-82③・任意機能）。
  // 主ソース（TheSportsDB）が確定できなかった「過去/当日のグループ試合」だけを対象に、
  // Wikipedia から結果を導出して埋める。確定済みは対象に含めない＝主ソース優先＆冪等。
  // 失敗は隔離し（部分失敗は failures に集約）、取込全体は止めない。
  let fallbackUpdated = 0;
  if (typeof provider.fetchFallbackResults === 'function') {
    try {
      const today = utcDateString(new Date());
      const fifaById = new Map(teams.map((t) => [t.id, t.fifaCode.toUpperCase()]));
      const targets: FallbackResultTarget[] = [];
      // 対象にした試合 id の集合。provider が targets 外の結果を返しても、ここに無い試合は
      // 適用しない（書き込み経路の防御: 主ソース優先・グループ限定を provider の善意に依存させない）。
      const targetMatchIds = new Set<number>();
      for (const m of matches) {
        // 対象: グループ・両チーム確定・未確定（finished でなく今回も更新していない）・過去/当日。
        if (m.stage !== 'group_stage' || !m.groupLetter) continue;
        if (!m.homeTeamId || !m.awayTeamId) continue;
        if (m.status === 'finished' || matchIds.includes(m.id)) continue;
        if (m.matchDate > today) continue;
        const homeCode = fifaById.get(m.homeTeamId);
        const awayCode = fifaById.get(m.awayTeamId);
        if (!homeCode || !awayCode) continue;
        targets.push({
          stage: m.stage,
          groupLetter: m.groupLetter,
          homeCode,
          awayCode,
          matchDate: m.matchDate,
        });
        targetMatchIds.add(m.id);
      }

      if (targets.length > 0) {
        const fallbackResults = await provider.fetchFallbackResults(targets);
        // 対象 id 内の更新だけを適用する（targets 外の試合は触らない）。
        const fallbackUpdates = planMatchUpdates(fallbackResults, matches, teams).filter((u) =>
          targetMatchIds.has(u.matchId),
        );
        for (const update of fallbackUpdates) {
          try {
            await updateMatchResult(update);
            matchIds.push(update.matchId);
            fallbackUpdated += 1;
          } catch (error) {
            failures.push({
              matchId: update.matchId,
              message: error instanceof Error ? error.message : 'fallback update failed',
            });
          }
        }
      }
    } catch (error) {
      console.error('[ingest] 結果フォールバックに失敗', error);
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
    fallbackUpdated,
    events,
  };
}
