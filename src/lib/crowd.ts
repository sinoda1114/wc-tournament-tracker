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
 * 投票のライフサイクル状態。
 *   not_yet_open … 対象チームがまだ揃っていない（出場枠が未確定）＝まだ開かない
 *   open         … チームが揃い、そのラウンドの初戦KOがまだ来ていない＝投票受付中
 *   closed       … 初戦KO時刻を過ぎた＝ロック（結果待ち/進行中。結果は確定表示）
 *   archived     … そのラウンドの全試合が終了＝履歴（消さずに残す）
 *
 * ＊「締切＝そのラウンドの初戦KO時刻」を採用するのは、結果が出る前にロックして
 *   "ガチ予想" を担保するため。
 */
export type VotingState = 'not_yet_open' | 'open' | 'closed' | 'archived';

type LifecycleMatch = Pick<
  Match,
  'stage' | 'status' | 'homeTeamId' | 'awayTeamId' | 'kickoffAt'
>;

/** そのステージの試合のうち最小の kickoffAt（＝初戦KO時刻）。1つも無ければ null。 */
function firstKickoffAt(matches: LifecycleMatch[], stage: VotingStage): Date | null {
  let earliest: Date | null = null;
  for (const match of matches) {
    if (match.stage !== stage || !match.kickoffAt) continue;
    const at = new Date(match.kickoffAt);
    if (Number.isNaN(at.getTime())) continue;
    if (!earliest || at.getTime() < earliest.getTime()) earliest = at;
  }
  return earliest;
}

/**
 * 指定ステージの投票ライフサイクル状態を、現在時刻・初戦KO時刻・出場確定状況から判定する純関数。
 * DB に締切フラグを持たせず、サーバ側で一意に算出する（後方互換・冪等）。
 */
export function stageVotingState(
  matches: LifecycleMatch[],
  stage: VotingStage,
  now: Date = new Date(),
): VotingState {
  const inStage = matches.filter((m) => m.stage === stage);
  // そのステージの試合がまだ無い＝開かない。
  if (inStage.length === 0) return 'not_yet_open';

  // 全試合終了＝履歴（アーカイブ）。
  if (inStage.every((m) => m.status === 'finished')) return 'archived';

  // 対象チームがまだ1チームも確定していない＝開かない。
  const hasAnyTeam = inStage.some((m) => m.homeTeamId || m.awayTeamId);
  if (!hasAnyTeam) return 'not_yet_open';

  // 締切＝初戦KO時刻。到来済みなら closed（ロック）。
  const kickoff = firstKickoffAt(inStage, stage);
  if (kickoff && now.getTime() >= kickoff.getTime()) return 'closed';

  return 'open';
}

/** そのステージが今まさに投票を受け付けているか（open のときだけ true）。 */
export function stageOpenForVoting(
  matches: LifecycleMatch[],
  stage: VotingStage,
  now: Date = new Date(),
): boolean {
  return stageVotingState(matches, stage, now) === 'open';
}

/**
 * いま投票できるステージ＝進行順で最初に open になっているステージ。
 * 無ければ null（受付中のステージなし）。
 * ＊ currentVotingStage（未終了試合の有無で判定）と異なり、初戦KO締切を考慮する。
 */
export function votableStage(
  matches: LifecycleMatch[],
  now: Date = new Date(),
): VotingStage | null {
  for (const stage of VOTING_STAGES) {
    if (stageVotingState(matches, stage, now) === 'open') return stage;
  }
  return null;
}

/** アーカイブ済み（履歴化された）投票ステージを進行順で返す。 */
export function archivedVotingStages(
  matches: LifecycleMatch[],
  now: Date = new Date(),
): VotingStage[] {
  return VOTING_STAGES.filter(
    (stage) => stageVotingState(matches, stage, now) === 'archived',
  );
}

/**
 * 敗退が確定したチームの teamId 集合。
 * 決勝T（KO）で勝者が確定した試合の「敗者」を敗退扱いにする（third_place 含む）。
 * 優勝予想で敗退チームをグレー化・選択不可にするのに使う。
 */
export function eliminatedTeamIds(
  matches: Pick<Match, 'homeTeamId' | 'awayTeamId' | 'winnerTeamId' | 'status'>[],
): Set<string> {
  const eliminated = new Set<string>();
  for (const m of matches) {
    if (m.status !== 'finished' || !m.winnerTeamId) continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const loser = m.winnerTeamId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
    eliminated.add(loser);
  }
  return eliminated;
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

/**
 * 指定ステージの票だけを teamId 別に集計する（アーカイブ／現ラウンドの履歴表示用）。
 * aggregateLatestVotes と異なり、ステージをまたいだ上書きはしない（そのラウンド単独の結果）。
 */
export function aggregateVotesByStage(
  votes: CrowdVote[],
  stage: VotingStage,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of votes) {
    if (v.stage !== stage) continue;
    counts.set(v.teamId, (counts.get(v.teamId) ?? 0) + 1);
  }
  return counts;
}
