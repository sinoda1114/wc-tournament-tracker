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
 *   open         … チームが揃い、次の投票ステージがまだ始まっていない＝投票受付中
 *   closed       … 次の投票ステージが始まった＝ロック（結果待ち/進行中。結果は確定表示）
 *   archived     … そのラウンドの全試合が終了＝履歴（消さずに残す）
 *
 * ＊「締切＝次の投票ステージの初戦KO時刻」を採用する（マネタイズ確定仕様）。
 *   そのステージの投票はステージ進行中ずっと開き、次ステージに入った瞬間ロックする
 *   （＝「各ステージの最終日まで開放／次ステージでロック」）。グループ戦投票を
 *   開幕戦で即ロックしていた旧仕様（"全締切" の死に体状態の原因）を是正する。
 *   1ステージ＝1票・投じたらロックは従来どおり（ガチ予想）。
 */
export type VotingState = 'not_yet_open' | 'open' | 'closed' | 'archived';

type LifecycleMatch = Pick<
  Match,
  'stage' | 'status' | 'homeTeamId' | 'awayTeamId' | 'kickoffAt'
>;

/**
 * このステージの投票締切＝「次の投票ステージの初戦KO時刻」。
 * ＝そのステージの投票はステージ進行中ずっと開き、次ステージが始まったらロックする。
 * 進行順で後ろの VOTING_STAGES に属する試合の最小 kickoffAt を返す。無ければ null（締切なし）。
 */
function nextStageFirstKickoff(
  matches: LifecycleMatch[],
  stage: VotingStage,
): Date | null {
  const currentRank = (VOTING_STAGES as readonly string[]).indexOf(stage);
  let earliest: Date | null = null;
  for (const match of matches) {
    const rank = (VOTING_STAGES as readonly string[]).indexOf(match.stage);
    if (rank <= currentRank || !match.kickoffAt) continue;
    const at = new Date(match.kickoffAt);
    if (Number.isNaN(at.getTime())) continue;
    if (!earliest || at.getTime() < earliest.getTime()) earliest = at;
  }
  return earliest;
}

/**
 * 指定ステージの投票ライフサイクル状態を、現在時刻・次ステージ開始時刻・出場確定状況から判定する純関数。
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

  // 締切＝次の投票ステージの初戦KO時刻。到来済み（＝次ステージ開始済み）なら closed（ロック）。
  // 次ステージが無い(final)／未定なら締切なし＝全試合終了で archived になるまで open。
  const deadline = nextStageFirstKickoff(matches, stage);
  if (deadline && now.getTime() >= deadline.getTime()) return 'closed';

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
 * ＊ currentVotingStage（未終了試合の有無で判定）と異なり、次ステージ開始締切を考慮する。
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

/**
 * まだ開いていない（出場国が未確定等の）投票ステージが残っているか。
 *
 * 締切メッセージの出し分け用。`votableStage` が null のとき:
 *  - これが **true** → 「移行中」（あるステージが締め切られ、次ステージの出場国確定待ち）
 *    ＝『次ステージの投票はまもなく開始します』を出すべき場面。
 *  - これが **false** → 全投票ステージ消化済み（決勝まで終了）＝『締め切られました（最終固定）』。
 * 大会進行中は group/前のラウンドが open のため votableStage が null にならず、この関数の
 * 値は使われない（呼び出し側が null のときだけ参照する）。
 */
export function hasUpcomingVotingStage(
  matches: LifecycleMatch[],
  now: Date = new Date(),
): boolean {
  return VOTING_STAGES.some((stage) => stageVotingState(matches, stage, now) === 'not_yet_open');
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
 *
 * 注意: グループステージは対象外。1試合落としても勝ち抜け可能なので、group_stage の
 * 敗者を敗退扱いにしてはいけない（以前 stage を無視して全 finished 敗者を拾い、グループ
 * 1敗のチームが誤って取り消し線になっていた）。数学的なグループ敗退の判定は別途。
 */
export function eliminatedTeamIds(
  matches: Pick<Match, 'stage' | 'homeTeamId' | 'awayTeamId' | 'winnerTeamId' | 'status'>[],
): Set<string> {
  const eliminated = new Set<string>();
  for (const m of matches) {
    if (m.stage === 'group_stage') continue; // グループ戦の敗者は敗退ではない
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
