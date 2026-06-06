import type { MatchDetail, MatchStatus } from '@/db/queries';
import { toJstYmd, toZonedYmd } from '@/lib/date-filter';
import { ja, type Dictionary } from '@/lib/i18n/messages/ja';

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

// ステージ名/試合状態の正本は i18n 辞書（ja）。多言語で出し分けたい公開UIは
// dict.match.stage / dict.match.status を直接引く。以下の定数は既定ロケール(ja)の値で、
// 言語切替が不要な箇所（管理画面・OGP画像・JSON-LD・テスト）向けの後方互換 export。
// ja.match.stage のキー過不足はこの代入で MatchStage と突き合わせて検証される。
export const STAGE_LABELS: Record<MatchStage, string> = ja.match.stage;

export const STATUS_LABELS: Record<MatchStatus, string> = ja.match.status;

/** スロット系ヘルパーが受け取る辞書スライス（{@link Dictionary}['match']['slot']）。 */
type SlotDict = Dictionary['match']['slot'];

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

export function formatMatchDate(
  matchDate: string,
  weekdays: readonly string[] = ja.match.weekdays,
) {
  const [yearStr, monthStr, dayStr] = matchDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const weekday = weekdays[new Date(year, month - 1, day).getDay()];
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
export function formatMatchDateJst(
  match: {
    kickoffAt: string | null;
    matchDate: string;
  },
  weekdays: readonly string[] = ja.match.weekdays,
): string {
  return formatMatchDate(toJstYmd(match.kickoffAt) ?? match.matchDate, weekdays);
}

/**
 * 試合カードの日付ラベルを任意 TZ（観戦者ローカル）の暦日で整形する。
 * 同カードの時刻表示（{@link formatKickoff} に同じ timeZone を渡す）と必ず一致させる。
 */
export function formatMatchDateZoned(
  match: {
    kickoffAt: string | null;
    matchDate: string;
  },
  timeZone: string,
  weekdays: readonly string[] = ja.match.weekdays,
): string {
  return formatMatchDate(toZonedYmd(match.kickoffAt, timeZone) ?? match.matchDate, weekdays);
}

const WINNER_PATTERN = /^Winner match (\d+)$/i;
const LOSER_PATTERN = /^Runner-up match (\d+)$/i;
const GROUP_FIRST_PATTERN = /^Group ([A-L]) winners$/i;
const GROUP_SECOND_PATTERN = /^Group ([A-L]) runners-up$/i;
const GROUP_THIRD_PATTERN = /^Group ([A-L/]+) third place$/i;

export function formatSlotLabel(slot: string, t: SlotDict = ja.match.slot): string {
  if (!slot) {
    return slot;
  }

  const winner = slot.match(WINNER_PATTERN);
  if (winner) {
    return t.winner.replace('{n}', winner[1]);
  }

  const loser = slot.match(LOSER_PATTERN);
  if (loser) {
    return t.loser.replace('{n}', loser[1]);
  }

  // 「グループ」の語は冗長で枠から溢れるため落とし、組記号だけにする。
  // 例: グループA 1位 → A 1位 / グループ A/B/C/D/F の3位 → A/B/C/D/F 3位
  const groupFirst = slot.match(GROUP_FIRST_PATTERN);
  if (groupFirst) {
    return t.groupFirst.replace('{g}', groupFirst[1].toUpperCase());
  }

  const groupSecond = slot.match(GROUP_SECOND_PATTERN);
  if (groupSecond) {
    return t.groupSecond.replace('{g}', groupSecond[1].toUpperCase());
  }

  const groupThird = slot.match(GROUP_THIRD_PATTERN);
  if (groupThird) {
    return t.groupThird.replace('{g}', groupThird[1].toUpperCase());
  }

  return slot;
}

/**
 * スロットの全文ラベル（ホバーの title 属性用）。
 * 表示は {@link formatSlotLabel} で短縮するため枠で欠けることがある。その補助として、
 * 省略しない説明文を返す（特に複数組3位の「A/B/C/D/F のいずれかの3位」）。
 */
export function formatSlotTitle(slot: string, t: SlotDict = ja.match.slot): string {
  if (!slot) {
    return slot;
  }

  const winner = slot.match(WINNER_PATTERN);
  if (winner) {
    return t.winnerTitle.replace('{n}', winner[1]);
  }

  const loser = slot.match(LOSER_PATTERN);
  if (loser) {
    return t.loserTitle.replace('{n}', loser[1]);
  }

  const groupFirst = slot.match(GROUP_FIRST_PATTERN);
  if (groupFirst) {
    return t.groupFirstTitle.replace('{g}', groupFirst[1].toUpperCase());
  }

  const groupSecond = slot.match(GROUP_SECOND_PATTERN);
  if (groupSecond) {
    return t.groupSecondTitle.replace('{g}', groupSecond[1].toUpperCase());
  }

  const groupThird = slot.match(GROUP_THIRD_PATTERN);
  if (groupThird) {
    return t.groupThirdTitle.replace('{g}', groupThird[1].toUpperCase());
  }

  return slot;
}

export function getParticipantLabel(
  team: MatchDetail['homeTeam'],
  slot: string,
  t: SlotDict = ja.match.slot,
) {
  if (team) {
    return team.nameJa;
  }

  return formatSlotLabel(slot, t);
}

export function isWinner(teamId: string | null, winnerTeamId: string | null) {
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

/** キックオフ時刻を任意 TZ（観戦者ローカル）で HH:mm（24h）に整形する。null/不正TZ は null。 */
export function formatKickoff(
  kickoffAt: string | null,
  timeZone: string,
): string | null {
  if (!kickoffAt) return null;
  const d = new Date(kickoffAt);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return null;
  }
}
