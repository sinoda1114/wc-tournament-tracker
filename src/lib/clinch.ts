/**
 * グループ突破の「数学的確定（クリンチ）」判定（T-105・純TS・DB非依存）。
 *
 * 「残り試合の全結果を考慮しても、もう 2 位以内（または 1 位/2 位）を覆せない」チームを求める。
 * グループ完了（6/6）を待たず、確定した瞬間に突破/順位扱いにするためのロジック。
 *
 * 2026 大会のタイブレーク順（同勝点時）:
 *   a) 当該チーム間（直接対決）の勝点
 *   b) 直接対決の得失点差
 *   c) 直接対決の総得点
 *   d) 全試合の得失点差   e) 全試合の総得点 …
 * ＝ **全体得失点差(d) より「直接対決(a)」が先**。これが本判定の肝。
 *
 * 安全側の原則（誤確定しない = T-46 の前倒し bind バグを再発させない）:
 *   - 残り試合は W/D/L の 3 値で総当たり（最大 3^6=729 通り／組）。勝点で見るので軽い。
 *   - 各組合せで「自分(X)と同勝点になり得る相手」について、**直接対決の勝点(a)** を見る。
 *     直接対決(a)は W/D/L で勝点が決まる指標なので保守的にする必要がない:
 *       ・X の直接対決勝点が相手より「真に上」 → その相手は X より確実に下（脅威でない）。
 *       ・直接対決勝点が「同点」 → b/c/d は未消化スコア依存で動くため、保守的に「上に来うる」扱い。
 *   - これにより「自分が並ばれ得る相手すべてに直接対決で勝っている」場合は順位を確定できる
 *     （例: 6 点のメキシコが、6 点に届きうる唯一の相手 韓国 に勝っている → 1 位確定）。
 *
 * 判定:
 *   - X が「2 位以内確定」 ⇔ どの残り結果でも「X 以上に来うる他チーム」が 1 以下。
 *   - X が「1 位確定」     ⇔ どの残り結果でも「X 以上に来うる他チーム」が 0。
 *   - X が「2 位確定」     ⇔ 2 位以内確定 かつ どの残り結果でも「X より確実に上の他チーム」が 1 以上。
 */
import type { Match, Team } from '@/db/queries';

const POINTS_WIN = 3;
const POINTS_DRAW = 1;

/** クリンチ判定結果（1 チーム分）。 */
export type GroupClinch = {
  /** 2 位以内が数学的に確定（＝決勝T進出確定）。UI の「突破」緑に使う。 */
  clinchedTop2: boolean;
  /** 順位まで確定していれば 1 か 2、突破はしたが 1/2 位が未確定なら null。R32 の枠埋めに使う。 */
  clinchedPosition: 1 | 2 | null;
};

/** クリンチ判定に使う試合（必要な列だけ）。 */
type ClinchMatch = Pick<
  Match,
  'homeTeamId' | 'awayTeamId' | 'homeScore' | 'awayScore' | 'status'
>;

/** 1 試合の結果（勝点増分つき）。消化済み・各組合せの残り、いずれもこの形に正規化する。 */
type MatchOutcome = { home: string; away: string; homePts: number; awayPts: number };

type RemainingMatch = { home: string; away: string };

/** 残り試合 1 つの 3 結果（home勝ち / 引分 / away勝ち）を勝点増分で表す。 */
const OUTCOMES: ReadonlyArray<readonly [homePts: number, awayPts: number]> = [
  [POINTS_WIN, 0],
  [POINTS_DRAW, POINTS_DRAW],
  [0, POINTS_WIN],
];

/** finished のスコアから勝点増分 [home, away] を返す。 */
function pointsFromScore(homeScore: number, awayScore: number): readonly [number, number] {
  if (homeScore > awayScore) return [POINTS_WIN, 0];
  if (homeScore < awayScore) return [0, POINTS_WIN];
  return [POINTS_DRAW, POINTS_DRAW];
}

/** グループ内・両チーム確定の試合だけを「消化済み結果」「未消化」に振り分ける。 */
function splitMatches(
  teamIds: readonly string[],
  matches: readonly ClinchMatch[],
): { finished: MatchOutcome[]; remaining: RemainingMatch[] } {
  const set = new Set(teamIds);
  const finished: MatchOutcome[] = [];
  const remaining: RemainingMatch[] = [];
  for (const m of matches) {
    if (!m.homeTeamId || !m.awayTeamId) continue;
    if (!set.has(m.homeTeamId) || !set.has(m.awayTeamId)) continue;
    const decided = m.status === 'finished' && m.homeScore !== null && m.awayScore !== null;
    if (decided) {
      const [hp, ap] = pointsFromScore(m.homeScore as number, m.awayScore as number);
      finished.push({ home: m.homeTeamId, away: m.awayTeamId, homePts: hp, awayPts: ap });
    } else {
      remaining.push({ home: m.homeTeamId, away: m.awayTeamId });
    }
  }
  return { finished, remaining };
}

/** ある集合 group（同勝点で並ぶ集合）の中での直接対決勝点（criterion a）。 */
function headToHeadPoints(
  group: readonly string[],
  outcomes: readonly MatchOutcome[],
): Map<string, number> {
  const set = new Set(group);
  const h2h = new Map<string, number>(group.map((id) => [id, 0]));
  for (const o of outcomes) {
    if (!set.has(o.home) || !set.has(o.away)) continue;
    h2h.set(o.home, h2h.get(o.home)! + o.homePts);
    h2h.set(o.away, h2h.get(o.away)! + o.awayPts);
  }
  return h2h;
}

/**
 * グループ各チームの突破/順位クリンチを判定する。
 * @param teams グループの全チーム（通常 4）。
 * @param matches グループの全試合（消化済み＋未消化）。
 */
export function clinchGroupQualification(
  teams: readonly Pick<Team, 'id'>[],
  matches: readonly ClinchMatch[],
): Map<string, GroupClinch> {
  const teamIds = teams.map((t) => t.id);
  const { finished, remaining } = splitMatches(teamIds, matches);

  const result = new Map<string, GroupClinch>(
    teamIds.map((id) => [id, { clinchedTop2: false, clinchedPosition: null }]),
  );
  // 安全弁: 残りが多すぎる場合（通常あり得ない）は判定しない。
  if (remaining.length > 12) return result;

  const combos = Math.pow(3, remaining.length);
  // 各チームについて、全組合せにわたる最悪/最良値を集計する。
  const maxAbovePossible = new Map<string, number>(teamIds.map((id) => [id, 0])); // max #(X以上に来うる他チーム)
  const minAboveDefinite = new Map<string, number>(
    teamIds.map((id) => [id, Number.POSITIVE_INFINITY]),
  ); // min #(X より確実に上の他チーム)

  for (let c = 0; c < combos; c++) {
    // この組合せでの全試合結果（消化済み + 残りの W/D/L）。
    const outcomes: MatchOutcome[] = finished.slice();
    let n = c;
    for (const rm of remaining) {
      const [hp, ap] = OUTCOMES[n % 3];
      n = Math.floor(n / 3);
      outcomes.push({ home: rm.home, away: rm.away, homePts: hp, awayPts: ap });
    }

    // 総勝点。
    const pts = new Map<string, number>(teamIds.map((id) => [id, 0]));
    for (const o of outcomes) {
      pts.set(o.home, pts.get(o.home)! + o.homePts);
      pts.set(o.away, pts.get(o.away)! + o.awayPts);
    }

    for (const x of teamIds) {
      const px = pts.get(x)!;
      // 勝点で X より上 = タイブレーク不要で確実に上。
      let moreTotal = 0;
      for (const o of teamIds) {
        if (o !== x && pts.get(o)! > px) moreTotal += 1;
      }
      // X と同勝点の集合 group の中で、直接対決勝点(a)を比較する。
      const group = teamIds.filter((t) => pts.get(t)! === px);
      const h2h = headToHeadPoints(group, outcomes);
      const hx = h2h.get(x)!;
      let h2hStrictlyAbove = 0; // 直接対決勝点が X より真に上 = 確実に上（criterion a で確定）。
      let h2hEqual = 0; // 直接対決勝点も同点 = b/c/d 次第で上もありうる（保守的に脅威扱い）。
      for (const g of group) {
        if (g === x) continue;
        const hg = h2h.get(g)!;
        if (hg > hx) h2hStrictlyAbove += 1;
        else if (hg === hx) h2hEqual += 1;
      }

      const aboveDefinite = moreTotal + h2hStrictlyAbove;
      const abovePossible = aboveDefinite + h2hEqual;
      if (abovePossible > maxAbovePossible.get(x)!) maxAbovePossible.set(x, abovePossible);
      if (aboveDefinite < minAboveDefinite.get(x)!) minAboveDefinite.set(x, aboveDefinite);
    }
  }

  for (const x of teamIds) {
    const maxAbove = maxAbovePossible.get(x)!;
    const minDef = minAboveDefinite.get(x)!;
    const clinchedTop2 = maxAbove <= 1;
    let clinchedPosition: 1 | 2 | null = null;
    if (maxAbove === 0) {
      clinchedPosition = 1; // どの結果でも誰も X 以上に来られない = 1 位確定。
    } else if (clinchedTop2 && minDef >= 1) {
      clinchedPosition = 2; // 2 位以内確定 かつ どの結果でも常に誰か 1 人が確実に上 = 2 位確定。
    }
    result.set(x, { clinchedTop2, clinchedPosition });
  }
  return result;
}
