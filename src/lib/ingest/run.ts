import { replaceAutoMatchEvents } from '@/db/match-events';
import { listAllTeams, listTournamentMatches, updateMatchResult } from '@/db/queries';
import { resolveAndPersistRoundOf32 } from '@/db/queries/round-of-32';

import {
  planMatchEventSyncs,
  planMatchUpdates,
  toAutoMatchEvents,
  type MatchEventSync,
} from './reconcile';
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
  /** 自己矛盾（得点者件数 ≠ スコア合計）で書き込みを見送った試合数（T-85(B)・固着はさせない）。 */
  skippedInconsistent: number;
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
 * 終了後この時間内の finished グループ戦は、TheSportsDB の結果窓に依存せず毎 cron で
 * Wikipedia から能動的に再同期する（T-85(A)・収束モデル）。Wikipedia はラインナップ/交代の
 * 記入が数十分〜数時間遅れるため、終了直後に詳細が空でも、この窓の間に必ず正へ収束させる。
 */
const RESYNC_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 得点系イベント（goal/penalty_goal/own_goal）の件数。1得点=1イベントなのでスコア合計と一致するはず。 */
function countGoalEvents(events: { type: string }[]): number {
  return events.filter(
    (e) => e.type === 'goal' || e.type === 'penalty_goal' || e.type === 'own_goal',
  ).length;
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

  // teamId→FIFAコード、matchId→試合 の索引（フォールバック・再同期・自己矛盾ガードで共用）。
  const fifaById = new Map(teams.map((t) => [t.id, t.fifaCode.toUpperCase()]));
  const matchById = new Map(matches.map((m) => [m.id, m]));

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
  // フォールバックで確定した試合のイベント同期 context。主ソースの結果起点で計画される通常の
  // イベント同期（planMatchEventSyncs）は TheSportsDB に無い試合を拾えないため、ここで明示的に
  // 補う（=スコアだけ埋めて得点者が載らない、を防ぐ＝T-81 の主症状の完全解消）。
  const fallbackEventSyncs: MatchEventSync[] = [];
  if (typeof provider.fetchFallbackResults === 'function') {
    try {
      const today = utcDateString(new Date());
      const targets: FallbackResultTarget[] = [];
      // 対象にした試合 id の集合。provider が targets 外の結果を返しても、ここに無い試合は
      // 適用しない（書き込み経路の防御: 主ソース優先・グループ限定を provider の善意に依存させない）。
      const targetMatchIds = new Set<number>();
      const targetById = new Map<number, (typeof matches)[number]>();
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
        targetById.set(m.id, m);
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
            // 確定できた試合は得点者イベントも Wikipedia から同期する（後段のイベント同期に合流）。
            const m = targetById.get(update.matchId);
            if (m && m.homeTeamId && m.awayTeamId && m.groupLetter) {
              fallbackEventSyncs.push({
                matchId: m.id,
                externalEventId: '', // Wikipedia は stage/group/code で特定するため未使用。
                homeTeamId: m.homeTeamId,
                awayTeamId: m.awayTeamId,
                homeCode: fifaById.get(m.homeTeamId) ?? m.homeTeamId.toUpperCase(),
                awayCode: fifaById.get(m.awayTeamId) ?? m.awayTeamId.toUpperCase(),
                stage: m.stage,
                groupLetter: m.groupLetter,
              });
            }
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

  // 順位表から R32 入口（home/away_team_id）を埋める。
  // 毎 ingest で無条件に実行する（冪等＝確定済み・変化なしは 0 更新で軽量）。今回スコア更新が
  // 無くても走らせる理由: クリンチ判定ロジックの更新やデータ揺れがあっても、次の cron で必ず
  // 「順位確定 → R32 入口」へ収束させる（自己収束モデル）。R32 解決の失敗は取込成功を覆さない。
  let roundOf32Updated = 0;
  try {
    const r32 = await resolveAndPersistRoundOf32();
    roundOf32Updated = r32.updated;
  } catch (error) {
    console.error('[ingest] R32 解決に失敗', error);
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
    skippedInconsistent: 0,
    perMatch: [],
    failures: [],
  };
  if (typeof provider.fetchMatchEvents === 'function') {
    // (A) 収束モデル: イベント同期を3つの源から計画する（matchId で重複排除・先勝ち）。
    //   1) planned        = 主ソース(TheSportsDB)結果起点（externalEventId あり）
    //   2) fallbackEventSyncs = T-82③ で確定したフォールバック試合
    //   3) resync         = **終了後24h の finished グループ戦**を TheSportsDB の結果窓に依らず
    //                       Wikipedia から能動再同期（窓から落ちても収束を保証＝T-85 の本丸）
    const planned = planMatchEventSyncs(results, matches, teams);
    const nowMs = Date.now();
    const resync: MatchEventSync[] = [];
    for (const m of matches) {
      if (m.stage !== 'group_stage' || !m.groupLetter) continue;
      if (m.status !== 'finished' || !m.homeTeamId || !m.awayTeamId) continue;
      // 終了時刻の代理として matches.updatedAt を使う。matches.updatedAt を更新するのは
      // updateMatchResult（スコア変化時のみ・冪等）だけで、replaceAutoMatchEvents は match_events
      // 側を触り matches は触らない。よって終了後は安定。窓がズレても「再同期が増える＝収束に有利」
      // 側にしか倒れない（過剰再同期は冪等で無害／過少にはならない）。
      const finishedAt = Date.parse(m.updatedAt);
      if (Number.isNaN(finishedAt) || nowMs - finishedAt > RESYNC_WINDOW_MS) continue;
      resync.push({
        matchId: m.id,
        externalEventId: '', // Wikipedia は stage/group/code で特定（externalEventId 不使用）。
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeCode: fifaById.get(m.homeTeamId) ?? m.homeTeamId.toUpperCase(),
        awayCode: fifaById.get(m.awayTeamId) ?? m.awayTeamId.toUpperCase(),
        stage: m.stage,
        groupLetter: m.groupLetter,
      });
    }
    // matchId で重複排除（先勝ち）。同一試合が planned と resync の両方にいる場合は planned を残す:
    // 本番 provider(withWikipediaEvents) は externalEventId に依らず常に Wikipedia を優先するため
    // どちらの起点でも収束は同じ。かつ planned は実 externalEventId を持つので、Wikipedia 空時に
    // base(TheSportsDB) タイムラインへ正しくフォールバックできる分だけ有利。
    const seenSync = new Set<number>();
    const syncs: MatchEventSync[] = [];
    for (const s of [...planned, ...fallbackEventSyncs, ...resync]) {
      if (seenSync.has(s.matchId)) continue;
      seenSync.add(s.matchId);
      syncs.push(s);
    }
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
        // (B) 自己矛盾ガード: finished かつスコア記録ありの試合で「得点者件数 ≠ スコア合計」の
        // バッチは書かない（編集途中/荒らし/パースミスを弾く）。⚠️古いデータはロックしない＝
        // この回をスキップするだけで再同期は回り続け、整合版が来れば即採用（固着させない）。
        const m = matchById.get(sync.matchId);
        if (m && m.status === 'finished' && m.homeScore !== null && m.awayScore !== null) {
          if (countGoalEvents(auto) !== m.homeScore + m.awayScore) {
            // skip は「取得0件(empty)」とは別物なので perMatch には積まない（集計は
            // skippedInconsistent。該当試合は監査の scorers_incomplete/excess でも可視化される）。
            events.skippedInconsistent += 1;
            continue;
          }
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
