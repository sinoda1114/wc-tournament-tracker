/**
 * グループ突破の「数学的確定（クリンチ）」判定（T-105・純TS・DB非依存）。
 *
 * 「残り試合の全結果を考慮しても、もう 2 位以内を覆せない」チームを求める。
 * グループ完了（6/6）を待たず、確定した瞬間に突破扱いにするためのロジック。
 *
 * 安全側の原則（誤確定しない = T-46 の前倒し bind バグを再発させない）:
 *   得失点差は残り試合のスコア次第でいくらでも動くため、**勝点が同点になり得る相手は
 *   「自分より上になり得る脅威」として数える**。よって判定は勝点ベースで保守的に行う:
 *   - X が「2 位以内確定」 ⇔ どの残り結果でも「X 以上の勝点になり得る他チーム」が 1 以下。
 *   - X が「1 位確定」     ⇔ どの残り結果でも「X 以上の勝点の他チーム」が 0。
 *   - X が「2 位確定」     ⇔ 上記 2 位以内確定 かつ どの残り結果でも「X より上の勝点の他チーム」が 1 以上
 *                            （= 常に誰か 1 人だけが上 = 必ず 2 位）。
 *
 * 残り試合は W/D/L の 3 値で総当たり（最大 3^6=729 通り／組）。勝点だけ見るので軽い。
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

type RemainingMatch = { home: string; away: string };

/** 残り試合 1 つの 3 結果（home勝ち / 引分 / away勝ち）を勝点増分で表す。 */
const OUTCOMES: ReadonlyArray<readonly [homePts: number, awayPts: number]> = [
  [POINTS_WIN, 0],
  [POINTS_DRAW, POINTS_DRAW],
  [0, POINTS_WIN],
];

/** 消化済み試合から各チームの現在勝点を求める。 */
function basePoints(teamIds: readonly string[], matches: readonly ClinchMatch[]): Map<string, number> {
  const pts = new Map<string, number>(teamIds.map((id) => [id, 0]));
  for (const m of matches) {
    if (m.status !== 'finished' || m.homeScore === null || m.awayScore === null) continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;
    if (!pts.has(m.homeTeamId) || !pts.has(m.awayTeamId)) continue;
    if (m.homeScore > m.awayScore) {
      pts.set(m.homeTeamId, pts.get(m.homeTeamId)! + POINTS_WIN);
    } else if (m.homeScore < m.awayScore) {
      pts.set(m.awayTeamId, pts.get(m.awayTeamId)! + POINTS_WIN);
    } else {
      pts.set(m.homeTeamId, pts.get(m.homeTeamId)! + POINTS_DRAW);
      pts.set(m.awayTeamId, pts.get(m.awayTeamId)! + POINTS_DRAW);
    }
  }
  return pts;
}

/** まだ消化していない（両チーム確定済みの）試合を残り試合として抽出。 */
function remainingMatches(teamIds: readonly string[], matches: readonly ClinchMatch[]): RemainingMatch[] {
  const set = new Set(teamIds);
  const out: RemainingMatch[] = [];
  for (const m of matches) {
    const decided = m.status === 'finished' && m.homeScore !== null && m.awayScore !== null;
    if (decided) continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;
    if (!set.has(m.homeTeamId) || !set.has(m.awayTeamId)) continue;
    out.push({ home: m.homeTeamId, away: m.awayTeamId });
  }
  return out;
}

/**
 * グループ各チームの突破クリンチを判定する。
 * @param teams グループの全チーム（通常 4）。
 * @param matches グループの全試合（消化済み＋未消化）。
 */
export function clinchGroupQualification(
  teams: readonly Pick<Team, 'id'>[],
  matches: readonly ClinchMatch[],
): Map<string, GroupClinch> {
  const teamIds = teams.map((t) => t.id);
  const base = basePoints(teamIds, matches);
  const remaining = remainingMatches(teamIds, matches);

  // 安全弁: 残りが多すぎる場合（通常あり得ない）は判定しない。
  const result = new Map<string, GroupClinch>(
    teamIds.map((id) => [id, { clinchedTop2: false, clinchedPosition: null }]),
  );
  if (remaining.length > 12) return result;

  const combos = Math.pow(3, remaining.length);
  // 各チームについて、全組合せにわたる最悪値を集計する。
  const maxGeAbove = new Map<string, number>(teamIds.map((id) => [id, 0])); // max #(他チームの勝点 >= X)
  const minGtAbove = new Map<string, number>(teamIds.map((id) => [id, Number.POSITIVE_INFINITY])); // min #(他チームの勝点 > X)

  for (let c = 0; c < combos; c++) {
    const pts = new Map(base);
    let n = c;
    for (const rm of remaining) {
      const [hp, ap] = OUTCOMES[n % 3];
      n = Math.floor(n / 3);
      pts.set(rm.home, pts.get(rm.home)! + hp);
      pts.set(rm.away, pts.get(rm.away)! + ap);
    }
    for (const x of teamIds) {
      const px = pts.get(x)!;
      let ge = 0; // 他チームで px 以上
      let gt = 0; // 他チームで px より上
      for (const o of teamIds) {
        if (o === x) continue;
        const po = pts.get(o)!;
        if (po >= px) ge += 1;
        if (po > px) gt += 1;
      }
      if (ge > maxGeAbove.get(x)!) maxGeAbove.set(x, ge);
      if (gt < minGtAbove.get(x)!) minGtAbove.set(x, gt);
    }
  }

  for (const x of teamIds) {
    const maxGe = maxGeAbove.get(x)!;
    const minGt = minGtAbove.get(x)!;
    const clinchedTop2 = maxGe <= 1;
    let clinchedPosition: 1 | 2 | null = null;
    if (maxGe === 0) {
      clinchedPosition = 1; // 常に誰も同点以上に来られない = 1 位確定
    } else if (clinchedTop2 && minGt >= 1) {
      clinchedPosition = 2; // 2 位以内確定 かつ 常に誰か 1 人が上 = 2 位確定
    }
    result.set(x, { clinchedTop2, clinchedPosition });
  }
  return result;
}
