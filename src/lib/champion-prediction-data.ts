import {
  listCrowdVotes,
  listTeamRatings,
  listTournamentMatches,
} from '@/db/queries';
import { computeFactorScores, type FactorKey } from '@/lib/champion-prediction';
import { aggregateLatestVotes, eliminatedTeamIds } from '@/lib/crowd';

/**
 * 優勝予想（{@link ChampionPrediction}）の描画に必要なサーバ取得データ。
 * Map は RSC 境界を越えられないため factors はプレーンオブジェクトで返す。
 */
export type ChampionPredictionData = {
  teams: { id: string; nameJa: string; nameEn: string; fifaCode: string }[];
  factors: Record<FactorKey, Record<string, number>>;
  eliminatedIds: string[];
};

/**
 * 優勝予想カードに渡すデータをまとめて取得する（T-47 系の横展開）。
 *
 * /prediction だけでなく /groups・/teams の上部にも優勝予想を出すため、
 * もともと prediction/page.tsx にあった取得ロジックをここへ集約して共有する。
 * 試合・チームレーティング・みんなの投票から、確率計算用の factors（pastWorldCup/
 * fifaRank/wc2026/crowd）と、敗退確定チーム（グレー化用）を組み立てる。
 */
export async function loadChampionPredictionData(): Promise<ChampionPredictionData> {
  const [matches, teamRatings, votes] = await Promise.all([
    listTournamentMatches(),
    listTeamRatings(),
    listCrowdVotes(),
  ]);

  const crowdCounts = aggregateLatestVotes(votes);
  const factors = computeFactorScores(teamRatings, matches, crowdCounts);

  return {
    teams: teamRatings.map((t) => ({
      id: t.id,
      nameJa: t.nameJa,
      nameEn: t.nameEn,
      fifaCode: t.fifaCode,
    })),
    factors: {
      pastWorldCup: Object.fromEntries(factors.pastWorldCup),
      fifaRank: Object.fromEntries(factors.fifaRank),
      wc2026: Object.fromEntries(factors.wc2026),
      crowd: Object.fromEntries(factors.crowd),
    },
    eliminatedIds: [...eliminatedTeamIds(matches)],
  };
}
