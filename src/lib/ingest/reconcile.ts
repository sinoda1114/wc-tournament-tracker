import type { AutoMatchEventInput } from '@/db/match-events';
import type { MatchStatus, UpdateMatchResultInput } from '@/db/queries';

import { resolveTeamId, type ResolverTeam } from './team-resolver';
import type { MatchEventContext, NormalizedMatchEvent, NormalizedResult } from './types';

/** 突き合わせに必要な試合行の最小情報。 */
export type ReconcileMatch = {
  id: number;
  matchDate: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  stage: string;
  /** グループ文字（'A'..'L'）。決勝T等は null。Wikipedia の記事特定に使う。 */
  groupLetter: string | null;
};

/** 取得元（クラウドソース）の日付が公式から ±1 日ずれる事があるため許容する。 */
const DATE_TOLERANCE_DAYS = 1;

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

function dayDiff(a: string, b: string): number {
  const ms = Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`));
  return ms / 86_400_000;
}

/**
 * チームペア（無順序）→ 候補試合の索引。同一ペアが複数（グループ＋稀な決勝T再戦）の
 * ことがあるため配列で持ち、突き合わせ時に日付の近さで一意化する。
 */
function buildPairIndex(matches: ReconcileMatch[]): Map<string, ReconcileMatch[]> {
  const byPair = new Map<string, ReconcileMatch[]>();
  for (const m of matches) {
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const key = pairKey(m.homeTeamId, m.awayTeamId);
    const bucket = byPair.get(key) ?? [];
    bucket.push(m);
    byPair.set(key, bucket);
  }
  return byPair;
}

/** ペアで候補を引き、取得元日付に最も近い行（±1日以内）を返す。無ければ null。 */
function findClosestMatch(
  byPair: Map<string, ReconcileMatch[]>,
  homeId: string,
  awayId: string,
  dateEvent: string,
): ReconcileMatch | null {
  const all = byPair.get(pairKey(homeId, awayId)) ?? [];
  // 日付が無い結果（Wikipedia 主ソースは記事から日付を取らない）はペアのみで一意化する。
  // グループ内では同一ペアは1試合なので衝突しない。稀な決勝T再戦を避けるため group を優先。
  if (!dateEvent) {
    return all.find((m) => m.stage === 'group_stage') ?? all[0] ?? null;
  }
  const candidates = all
    .map((m) => ({ m, diff: dayDiff(m.matchDate, dateEvent) }))
    .filter((c) => c.diff <= DATE_TOLERANCE_DAYS)
    .sort((x, y) => x.diff - y.diff);
  return candidates[0]?.m ?? null;
}

/**
 * 取得結果を我々の試合行に突き合わせ、更新が必要な入力だけを生成する純関数。
 *
 * - 突き合わせは「日付 ＋ チームID無順序ペア」。両チーム確定済みの行のみ対象。
 * - 自チームの home/away 向きに合わせてスコアを割り当てる。
 * - 既に同じ結果なら更新しない（冪等）。スコアが違えば訂正として更新する。
 * - 決勝Tの同点（PK決着）は勝者をスコアから決められないためスキップ（手入力に委ねる）。
 * - 勝者は呼び出し側 `updateMatchResult` がスコア差から解決する（winnerTeamId は渡さない）。
 */
export function planMatchUpdates(
  results: NormalizedResult[],
  matches: ReconcileMatch[],
  teams: ResolverTeam[],
): UpdateMatchResultInput[] {
  const byPair = buildPairIndex(matches);

  // 試合単位で1件に絞る。複数ソースが同一試合に異なるスコアを返しても、
  // 先にソース優先で1件を選び（グループ戦は Wikipedia 勝ち）、その後に冪等判定する。
  // 順序やソース欠落（冪等スキップ）で run ごとに値が入れ替わる現象を防ぐ。
  type Candidate = { match: ReconcileMatch; ourHome: number; ourAway: number; source?: string };
  const chosen = new Map<number, Candidate>();

  for (const r of results) {
    if (!r.finished) continue;

    const homeId = resolveTeamId(r.homeName, teams);
    const awayId = resolveTeamId(r.awayName, teams);
    if (!homeId || !awayId) continue;

    const m = findClosestMatch(byPair, homeId, awayId, r.dateEvent);
    if (!m) continue;

    const sameOrientation = m.homeTeamId === homeId;
    const ourHome = sameOrientation ? r.homeScore : r.awayScore;
    const ourAway = sameOrientation ? r.awayScore : r.homeScore;
    if (ourHome === null || ourAway === null) continue;

    // 決勝Tの同点は PK 決着で、スコアだけでは勝者不明 → 手入力フォールバックに委ねる。
    if (ourHome === ourAway && m.stage !== 'group_stage') continue;

    const candidate: Candidate = { match: m, ourHome, ourAway, source: r.source };
    const existing = chosen.get(m.id);
    // 既存が無ければ採用。グループ戦で Wikipedia が来たら他ソースより優先（上書き）。
    const wikipediaWins =
      m.stage === 'group_stage' && candidate.source === 'wikipedia' && existing?.source !== 'wikipedia';
    if (!existing || wikipediaWins) chosen.set(m.id, candidate);
  }

  const updates: UpdateMatchResultInput[] = [];
  for (const c of chosen.values()) {
    // 冪等: 既に同じ確定結果なら更新不要（優先選択の後に判定するのが要点）。
    if (c.match.status === 'finished' && c.match.homeScore === c.ourHome && c.match.awayScore === c.ourAway) {
      continue;
    }
    updates.push({
      matchId: c.match.id,
      homeScore: c.ourHome,
      awayScore: c.ourAway,
      status: 'finished',
    });
  }

  return updates;
}

/**
 * 1試合分のイベント同期計画。homeTeamId/awayTeamId は **取得元の向き** で持つ。
 * MatchEventContext（provider が必要とする文脈）を内包するので、そのまま
 * provider.fetchMatchEvents に渡せる（homeCode/awayCode は home/awayTeamId の FIFAコード）。
 */
export type MatchEventSync = MatchEventContext & {
  matchId: number;
  /** 取得元の home に対応する我々の teamId（タイムラインの strHome 解決用）。 */
  homeTeamId: string;
  /** 取得元の away に対応する我々の teamId。 */
  awayTeamId: string;
};

/**
 * イベントタイムラインを同期すべき試合の計画を作る純関数。
 *
 * - 対象は「終了済み ＋ externalEventId あり ＋ 我々の試合に突き合う」結果。
 * - スコア更新（planMatchUpdates）と独立に判定する。既に結果が手入力済みで
 *   スコア更新が不要な試合でも、イベントが未取込なら補完できるようにするため。
 * - homeTeamId/awayTeamId は取得元の home/away の向きで保持する
 *   （タイムラインの isHome=取得元 home 基準。我々の行と向きが逆でも正しく解決できる）。
 * - 同一試合は重複させない（日付ウィンドウの重なり対策）。
 */
export function planMatchEventSyncs(
  results: NormalizedResult[],
  matches: ReconcileMatch[],
  teams: ResolverTeam[],
): MatchEventSync[] {
  const byPair = buildPairIndex(matches);
  const seen = new Set<number>();
  // teamId → FIFAコード（大文字）。Wikipedia の football box 特定/向き解決に渡す。
  const codeById = new Map(teams.map((t) => [t.id, t.fifaCode.toUpperCase()]));

  const syncs: MatchEventSync[] = [];
  for (const r of results) {
    if (!r.finished) continue;

    const homeId = resolveTeamId(r.homeName, teams);
    const awayId = resolveTeamId(r.awayName, teams);
    if (!homeId || !awayId) continue;

    const m = findClosestMatch(byPair, homeId, awayId, r.dateEvent);
    if (!m || seen.has(m.id)) continue;

    // グループ戦は Wikipedia が stage/group/コードで特定するため externalEventId 不要。
    // それ以外（決勝T等の TheSportsDB タイムライン）は externalEventId が無ければ同期できない。
    if (!r.externalEventId && m.stage !== 'group_stage') continue;
    seen.add(m.id);

    syncs.push({
      matchId: m.id,
      externalEventId: r.externalEventId ?? '',
      homeTeamId: homeId,
      awayTeamId: awayId,
      // MatchEventContext: 取得元の home/away の向きで FIFAコード・stage・group を持つ。
      homeCode: codeById.get(homeId) ?? homeId.toUpperCase(),
      awayCode: codeById.get(awayId) ?? awayId.toUpperCase(),
      stage: m.stage,
      groupLetter: m.groupLetter,
    });
  }
  return syncs;
}

/**
 * 正規化イベントを DB 挿入形式（AutoMatchEventInput）へ変換する純関数。
 * isHome（取得元の home 基準）を sync の teamId に解決し、
 * sortOrder はタイムライン順（index）で振って同分イベントの並びを安定させる。
 */
export function toAutoMatchEvents(
  events: NormalizedMatchEvent[],
  sync: Pick<MatchEventSync, 'homeTeamId' | 'awayTeamId'>,
): AutoMatchEventInput[] {
  return events.map((e, index) => ({
    type: e.type,
    minute: e.minute,
    teamId: e.isHome === true ? sync.homeTeamId : e.isHome === false ? sync.awayTeamId : null,
    playerName: e.playerName,
    playerOut: e.playerOut,
    sortOrder: index,
    externalId: e.externalId,
  }));
}
