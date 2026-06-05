import type { MatchDetail, MatchStatus } from '@/db/queries';
import { toJstYmd } from '@/lib/date-filter';

export type MatchStage =
  | 'group_stage'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final';

// STAGE_ORDER は決勝T (knockout) 専用の表示順。group_stage は別ページで表示するため
// 意図的に含めない。groupMatchesByStage は STAGE_ORDER のみをイテレートするので、
// group_stage の試合はこの関数の結果から除外される（/ の公開トップでは表示されない）。
export const STAGE_ORDER: MatchStage[] = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
];

export const STAGE_LABELS: Record<MatchStage, string> = {
  group_stage: 'グループリーグ',
  round_of_32: 'ラウンド32',
  round_of_16: 'ラウンド16',
  quarter_final: '準々決勝',
  semi_final: '準決勝',
  third_place: '3位決定戦',
  final: '決勝',
};

export const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: '予定',
  in_progress: '試合中',
  finished: '終了',
};

export function groupMatchesByStage(matches: MatchDetail[]) {
  const grouped = new Map<MatchStage, MatchDetail[]>();

  for (const stage of STAGE_ORDER) {
    grouped.set(stage, []);
  }

  for (const match of matches) {
    const stage = match.stage as MatchStage;
    const bucket = grouped.get(stage);

    if (bucket) {
      bucket.push(match);
    }
  }

  return STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    matches: grouped.get(stage) ?? [],
  })).filter((column) => column.matches.length > 0);
}

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

export function formatMatchDate(matchDate: string) {
  const [yearStr, monthStr, dayStr] = matchDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const weekday = WEEKDAYS_JA[new Date(year, month - 1, day).getDay()];
  return `${month}/${day}(${weekday})`;
}

/**
 * 試合カードの日付ラベルを JST 暦日で整形する。
 *
 * `kickoffAt`（TZ 付き ISO）を JST に変換した暦日を採用し、同じカードに並ぶ
 * 時刻表示（`formatKickoffJst` も JST）と必ず一致させる。`kickoffAt` が無い
 * 場合のみ会場ローカルの `matchDate` にフォールバックする。
 *
 * 例: 決勝（M104, 会場ローカル 7/19 15:00 ET）→ JST 7/20(月) 04:00 と表示。
 */
export function formatMatchDateJst(match: {
  kickoffAt: string | null;
  matchDate: string;
}): string {
  return formatMatchDate(toJstYmd(match.kickoffAt) ?? match.matchDate);
}

const WINNER_PATTERN = /^Winner match (\d+)$/i;
const LOSER_PATTERN = /^Runner-up match (\d+)$/i;
const GROUP_FIRST_PATTERN = /^Group ([A-L]) winners$/i;
const GROUP_SECOND_PATTERN = /^Group ([A-L]) runners-up$/i;
const GROUP_THIRD_PATTERN = /^Group ([A-L/]+) third place$/i;

export function formatSlotLabel(slot: string): string {
  if (!slot) {
    return slot;
  }

  const winner = slot.match(WINNER_PATTERN);
  if (winner) {
    return `勝者 #${winner[1]}`;
  }

  const loser = slot.match(LOSER_PATTERN);
  if (loser) {
    return `敗者 #${loser[1]}`;
  }

  // 「グループ」の語は冗長で枠から溢れるため落とし、組記号だけにする。
  // 例: グループA 1位 → A 1位 / グループ A/B/C/D/F の3位 → A/B/C/D/F 3位
  const groupFirst = slot.match(GROUP_FIRST_PATTERN);
  if (groupFirst) {
    return `${groupFirst[1].toUpperCase()} 1位`;
  }

  const groupSecond = slot.match(GROUP_SECOND_PATTERN);
  if (groupSecond) {
    return `${groupSecond[1].toUpperCase()} 2位`;
  }

  const groupThird = slot.match(GROUP_THIRD_PATTERN);
  if (groupThird) {
    return `${groupThird[1].toUpperCase()} 3位`;
  }

  return slot;
}

/**
 * スロットの全文ラベル（ホバーの title 属性用）。
 * 表示は {@link formatSlotLabel} で短縮するため枠で欠けることがある。その補助として、
 * 省略しない説明文を返す（特に複数組3位の「A/B/C/D/F のいずれかの3位」）。
 */
export function formatSlotTitle(slot: string): string {
  if (!slot) {
    return slot;
  }

  const winner = slot.match(WINNER_PATTERN);
  if (winner) {
    return `第${winner[1]}試合の勝者`;
  }

  const loser = slot.match(LOSER_PATTERN);
  if (loser) {
    return `第${loser[1]}試合の敗者`;
  }

  const groupFirst = slot.match(GROUP_FIRST_PATTERN);
  if (groupFirst) {
    return `グループ${groupFirst[1].toUpperCase()} 1位`;
  }

  const groupSecond = slot.match(GROUP_SECOND_PATTERN);
  if (groupSecond) {
    return `グループ${groupSecond[1].toUpperCase()} 2位`;
  }

  const groupThird = slot.match(GROUP_THIRD_PATTERN);
  if (groupThird) {
    return `グループ ${groupThird[1].toUpperCase()} のいずれかの3位`;
  }

  return slot;
}

export function getParticipantLabel(
  team: MatchDetail['homeTeam'],
  slot: string,
) {
  if (team) {
    return team.nameJa;
  }

  return formatSlotLabel(slot);
}

export function isWinner(
  teamId: string | null,
  winnerTeamId: string | null,
) {
  return Boolean(teamId && winnerTeamId && teamId === winnerTeamId);
}

export function formatKickoffJst(kickoffAt: string | null): string | null {
  if (!kickoffAt) return null;
  const d = new Date(kickoffAt);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}
