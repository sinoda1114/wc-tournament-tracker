import type { Match } from '@/db/queries';

/** 投票できる6つのステージ（third_place は除く）。配列の並びが「進行順」。 */
export const VOTING_STAGES = [
  'group_stage',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'final',
] as const;

export type VotingStage = (typeof VOTING_STAGES)[number];

export const STAGE_LABELS: Record<VotingStage, string> = {
  group_stage: 'グループリーグ',
  round_of_32: 'ラウンド32',
  round_of_16: 'ラウンド16',
  quarter_final: '準々決勝',
  semi_final: '準決勝',
  final: '決勝',
};

function isVotingStage(stage: string): stage is VotingStage {
  return (VOTING_STAGES as readonly string[]).includes(stage);
}

/**
 * いま投票を受け付けるステージ＝進行順で「未終了の試合を含む最初の投票ステージ」。
 * 全ステージが終了していれば null（投票締切）。
 */
export function currentVotingStage(
  matches: Pick<Match, 'stage' | 'status'>[],
): VotingStage | null {
  for (const stage of VOTING_STAGES) {
    const inStage = matches.filter((m) => m.stage === stage);
    if (inStage.length === 0) continue;
    if (inStage.some((m) => m.status !== 'finished')) return stage;
  }
  return null;
}

/**
 * 指定ステージの試合に出場している（＝まだ敗退していない）teamId 一覧。投票候補に使う。
 * チーム未確定（null）の枠は除外。
 */
export function aliveTeamIdsForStage(
  matches: Pick<Match, 'stage' | 'homeTeamId' | 'awayTeamId'>[],
  stage: VotingStage,
): string[] {
  const ids = new Set<string>();
  for (const m of matches) {
    if (m.stage !== stage) continue;
    if (m.homeTeamId) ids.add(m.homeTeamId);
    if (m.awayTeamId) ids.add(m.awayTeamId);
  }
  return [...ids];
}

export type CrowdVote = {
  voterId: string;
  stage: string;
  teamId: string;
};

function stageRank(stage: string): number {
  const idx = (VOTING_STAGES as readonly string[]).indexOf(stage);
  return idx; // 未知ステージは -1（既知ステージに負ける）
}

/**
 * voter ごとに「最も進んだステージの票」を採用し、teamId 別に集計する。
 * ステージが進むほど新しい意見で上書きされる挙動になる。
 */
export function aggregateLatestVotes(votes: CrowdVote[]): Map<string, number> {
  // voterId → 採用する票（最大ステージランク）
  const latest = new Map<string, CrowdVote>();
  for (const v of votes) {
    if (!isVotingStage(v.stage)) continue;
    const prev = latest.get(v.voterId);
    if (!prev || stageRank(v.stage) > stageRank(prev.stage)) {
      latest.set(v.voterId, v);
    }
  }

  const counts = new Map<string, number>();
  for (const v of latest.values()) {
    counts.set(v.teamId, (counts.get(v.teamId) ?? 0) + 1);
  }
  return counts;
}
