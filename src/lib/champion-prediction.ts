import type { Match, TeamRating } from '@/db/queries';

/** 予想に使う変数（factor）の識別子。 */
export type FactorKey = 'pastWorldCup' | 'fifaRank' | 'wc2026' | 'crowd';

/**
 * factor ごとの「teamId → 確率(0..1)」分布。各 Map は合計 1 に正規化済みで、
 * すべての値が 0 より大きい（ゼロ保護済み）。
 */
export type FactorScores = Record<FactorKey, Map<string, number>>;

/** 各 factor の ON/OFF。 */
export type FactorToggles = Record<FactorKey, boolean>;

/** 最終的な優勝予想 1 チーム分。`probability` は合計1の確率、降順で返る。 */
export type RankedPrediction = {
  teamId: string;
  probability: number;
  /** 参考表示用の factor 別スコア（各 factor の正規化済み確率）。 */
  components: Record<FactorKey, number>;
};

export const FACTOR_KEYS: readonly FactorKey[] = [
  'pastWorldCup',
  'fifaRank',
  'wc2026',
  'crowd',
];

/**
 * 直近3大会はいずれも32チーム制。順位 1〜32 を (33 − place)/32 で
 * (0,1] のスコアに反転する（1位=1.0、32位≈0.031、未出場=0）。
 */
const WC_FIELD_SIZE = 32;

/** 過去W杯 factor の floor。未出場チームでも僅少シェアを残しゼロ割れを防ぐ。 */
const PAST_WC_FLOOR = 0.01;

/** 2026成績 factor の加算平滑化。序盤の少試合の歪みを抑え、未実施時は均等にする。 */
const WC2026_SMOOTHING = 3;

/** みんなの予想 factor の floor。投票ゼロのチームでもゼロ割れを防ぐ。 */
const CROWD_FLOOR = 0.5;

const POINTS_WIN = 3;
const POINTS_DRAW = 1;

/**
 * raw スコアの Map を「合計1」に正規化して返す。合計が 0（理論上起きない想定）の
 * 場合は均等分布にフォールバックする。
 */
function normalize(raw: Map<string, number>): Map<string, number> {
  let total = 0;
  for (const v of raw.values()) total += v;

  const result = new Map<string, number>();
  if (total <= 0) {
    const uniform = raw.size > 0 ? 1 / raw.size : 0;
    for (const id of raw.keys()) result.set(id, uniform);
    return result;
  }
  for (const [id, v] of raw) result.set(id, v / total);
  return result;
}

/** 1大会分の最終順位を (0,1] スコアに変換。未出場(null)は 0。 */
function placeToScore(place: number | null): number {
  if (place === null) return 0;
  return (WC_FIELD_SIZE + 1 - place) / WC_FIELD_SIZE;
}

/** ① 過去W杯成績: 直近3大会の順位スコアをフラット平均し、floor を足して正規化。 */
function computePastWorldCupScores(teams: TeamRating[]): Map<string, number> {
  const raw = new Map<string, number>();
  for (const t of teams) {
    const avg =
      (placeToScore(t.wc2014Place) +
        placeToScore(t.wc2018Place) +
        placeToScore(t.wc2022Place)) /
      3;
    raw.set(t.id, avg + PAST_WC_FLOOR);
  }
  return normalize(raw);
}

/**
 * ② FIFAランク: 対象チーム内での相対順位を線形反転する。
 * 最強チームに N、最弱チームに 1 を与える（同ランク値は同スコア）。
 */
function computeFifaRankScores(teams: TeamRating[]): Map<string, number> {
  const n = teams.length;
  // fifaRank 昇順（小さい=強い）に並べ、相対順位 1..n を割り当てる。
  const sorted = [...teams].sort((a, b) => a.fifaRank - b.fifaRank);

  const rawByRankValue = new Map<string, number>();
  let prevRankValue: number | null = null;
  let relativeRank = 0;
  sorted.forEach((t, index) => {
    // 同じ fifaRank 値は同じ相対順位（=同スコア）にする。
    if (prevRankValue === null || t.fifaRank !== prevRankValue) {
      relativeRank = index + 1;
      prevRankValue = t.fifaRank;
    }
    rawByRankValue.set(t.id, n + 1 - relativeRank);
  });

  return normalize(rawByRankValue);
}

/**
 * ③ 2026成績: 終了した全試合（グループ+決勝T）の勝点を集計し、
 * 平滑化定数を足して正規化する。終了試合が無ければ全チーム均等（中立）。
 */
function computeWc2026Scores(
  teams: TeamRating[],
  matches: Match[],
): Map<string, number> {
  const points = new Map<string, number>();
  for (const t of teams) points.set(t.id, 0);

  for (const m of matches) {
    if (m.status !== 'finished') continue;
    if (m.homeScore === null || m.awayScore === null) continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;
    if (!points.has(m.homeTeamId) || !points.has(m.awayTeamId)) continue;

    if (m.homeScore > m.awayScore) {
      points.set(m.homeTeamId, points.get(m.homeTeamId)! + POINTS_WIN);
    } else if (m.homeScore < m.awayScore) {
      points.set(m.awayTeamId, points.get(m.awayTeamId)! + POINTS_WIN);
    } else {
      points.set(m.homeTeamId, points.get(m.homeTeamId)! + POINTS_DRAW);
      points.set(m.awayTeamId, points.get(m.awayTeamId)! + POINTS_DRAW);
    }
  }

  const raw = new Map<string, number>();
  for (const [id, pts] of points) raw.set(id, pts + WC2026_SMOOTHING);
  return normalize(raw);
}

/**
 * ④ みんなの予想: 各チームの得票数に floor を足して正規化。投票ゼロなら全チーム均等（中立）。
 */
function computeCrowdScores(
  teams: TeamRating[],
  crowdCounts: Map<string, number>,
): Map<string, number> {
  const raw = new Map<string, number>();
  for (const t of teams) {
    raw.set(t.id, (crowdCounts.get(t.id) ?? 0) + CROWD_FLOOR);
  }
  return normalize(raw);
}

/**
 * 各 factor を独立した確率分布として計算する。重い（matches/投票 依存）処理なので
 * サーバ側で1度だけ実行し、結果をクライアントへ渡す想定。
 * `crowdCounts` は teamId→得票数（省略時は投票ゼロ＝みんなの予想は中立）。
 */
export function computeFactorScores(
  teams: TeamRating[],
  matches: Match[],
  crowdCounts: Map<string, number> = new Map(),
): FactorScores {
  return {
    pastWorldCup: computePastWorldCupScores(teams),
    fifaRank: computeFifaRankScores(teams),
    wc2026: computeWc2026Scores(teams, matches),
    crowd: computeCrowdScores(teams, crowdCounts),
  };
}

/**
 * ON の factor だけをチームごとに掛け合わせ（product-of-experts）、合計1に
 * 再正規化して降順で返す。トグル変更のたびにクライアント側で軽く呼べる純関数。
 *
 * - 1つだけ ON → その factor 分布そのもの。
 * - 全 OFF → 均等（uniform）。
 * - 各 factor が floor 済みのため、結果が 0 になるチームは出ない。
 */
export function combineFactors(
  factors: FactorScores,
  toggles: FactorToggles,
): RankedPrediction[] {
  const teamIds = [...factors.pastWorldCup.keys()];
  const activeKeys = FACTOR_KEYS.filter((k) => toggles[k]);

  const componentsOf = (teamId: string): Record<FactorKey, number> => ({
    pastWorldCup: factors.pastWorldCup.get(teamId) ?? 0,
    fifaRank: factors.fifaRank.get(teamId) ?? 0,
    wc2026: factors.wc2026.get(teamId) ?? 0,
    crowd: factors.crowd.get(teamId) ?? 0,
  });

  const raw = new Map<string, number>();
  for (const id of teamIds) {
    if (activeKeys.length === 0) {
      raw.set(id, 1); // 全OFF → 後で均等になる
    } else {
      let product = 1;
      for (const k of activeKeys) product *= factors[k].get(id) ?? 0;
      raw.set(id, product);
    }
  }

  const normalized = normalize(raw);

  return [...normalized.entries()]
    .map(([teamId, probability]) => ({
      teamId,
      probability,
      components: componentsOf(teamId),
    }))
    .sort((a, b) => {
      if (b.probability !== a.probability) return b.probability - a.probability;
      return a.teamId.localeCompare(b.teamId);
    });
}
