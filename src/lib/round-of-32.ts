/**
 * グループステージ確定 → Round of 32 のスロット割当（純TS・DB非依存）。
 *
 * R32 の各試合は seed-matches.ts でスロット文字列として定義される:
 *   - 'Group X winners'      … グループX 1位
 *   - 'Group X runners-up'   … グループX 2位
 *   - 'Group A/B/C/D/F third place' … ベスト3位のうち、FIFA 割当でこの試合に入る3位
 *
 * 1位/2位は各グループ順位表から直に解決できる。3位は「12グループ各3位のうち上位8」を
 * 選抜し（FIFA タイブレーカー）、その8グループの組合せに応じた FIFA 公式割当
 * （lib/third-place）でホスト試合に配る。本モジュールはこの解決を純関数で行い、
 * DB 反映は呼び出し側（queries 等）に委ねる。
 */
import type { GroupStanding } from './standings';
import {
  assignThirdPlaceSlots,
  THIRD_PLACE_HOST_MATCHES,
  type GroupLetter,
} from './third-place';

/** 1グループ分の順位表（グループ識別子付き）。position 昇順である必要はない（内部で参照）。 */
export type GroupStandingsEntry = {
  group: GroupLetter;
  standings: GroupStanding[];
};

/** position(1..4) のチームを取り出す。無ければ null。 */
function teamAtPosition(standings: GroupStanding[], position: number): GroupStanding | null {
  return standings.find((s) => s.position === position) ?? null;
}

/**
 * 12グループ各3位を、ベスト3位ランキングのタイブレーカーで降順整列して返す純関数。
 *
 * FIFA 2026 の3位ランキング基準（本実装のスコープ）:
 *   1. 勝点  2. 得失点差  3. 総得点
 * 以降（フェアプレー / FIFA ランキング / 抽選）は standings.ts と同様スコープ外。
 * 同点が残った場合はグループ文字の昇順で安定化する（決定性のため）。
 *
 * @returns 3位チームを強い順に並べた配列（最大12要素。3位が存在しないグループは除外）。
 */
export function rankThirdPlacedTeams(
  groups: readonly GroupStandingsEntry[],
): { group: GroupLetter; standing: GroupStanding }[] {
  const thirds: { group: GroupLetter; standing: GroupStanding }[] = [];
  for (const { group, standings } of groups) {
    const third = teamAtPosition(standings, 3);
    if (third) thirds.push({ group, standing: third });
  }

  thirds.sort((a, b) => {
    const x = a.standing;
    const y = b.standing;
    if (y.points !== x.points) return y.points - x.points;
    if (y.goalDifference !== x.goalDifference) return y.goalDifference - x.goalDifference;
    if (y.goalsFor !== x.goalsFor) return y.goalsFor - x.goalsFor;
    return a.group.localeCompare(b.group);
  });

  return thirds;
}

/** R32 の1スロットの解決結果。teamId が null なら未確定（順位表不足・割当対象外）。 */
export type SlotResolution = {
  matchId: number;
  side: 'home' | 'away';
  slot: string;
  teamId: string | null;
};

const WINNERS_RE = /^Group ([A-L]) winners$/i;
const RUNNERS_RE = /^Group ([A-L]) runners-up$/i;
const THIRD_RE = /^Group [A-L/]+ third place$/i;

/**
 * R32 試合スロットの最小情報。seed-matches.ts / DB の matches 行から作れる。
 */
export type RoundOf32Slot = {
  matchId: number;
  side: 'home' | 'away';
  slot: string;
};

/**
 * グループ確定後、R32 の各スロットを teamId へ解決する純関数。
 *
 * - 'Group X winners' / 'Group X runners-up' は該当グループ順位表の 1位 / 2位。
 * - third place スロットは {@link rankThirdPlacedTeams} で上位8グループを選び、
 *   {@link assignThirdPlaceSlots}（FIFA 公式割当）で matchId ごとに3位グループを定め、
 *   そのグループの3位 teamId を割り当てる。
 * - 解決に必要な順位が確定していない場合は teamId=null（部分適用可・冪等の材料）。
 *
 * 8つの third place スロットが揃って初めて割当が成立する（FIFA 表が8グループ前提のため）。
 * 揃わない／3位が8グループ未満なら third place スロットは全て null のまま返す。
 *
 * @param slots R32 の全スロット（home/away 各16）。
 * @param groups 12グループ分の順位表。
 */
export function resolveRoundOf32Assignments(
  slots: readonly RoundOf32Slot[],
  groups: readonly GroupStandingsEntry[],
): SlotResolution[] {
  const standingsByGroup = new Map<GroupLetter, GroupStanding[]>();
  for (const { group, standings } of groups) {
    standingsByGroup.set(group, standings);
  }

  // ベスト3位 → ホスト試合 → 3位グループ の割当（成立すれば）。
  const ranked = rankThirdPlacedTeams(groups);
  const top8Groups = ranked.slice(0, 8).map((r) => r.group);
  const thirdAssignment =
    top8Groups.length === 8 ? assignThirdPlaceSlots(top8Groups) : null;

  // matchId → 割り当てられた3位グループ。
  const thirdGroupByMatch = new Map<number, GroupLetter>();
  if (thirdAssignment) {
    for (const a of thirdAssignment) thirdGroupByMatch.set(a.matchId, a.thirdPlaceGroup);
  }

  function teamIdByGroupPosition(group: GroupLetter, position: number): string | null {
    const standings = standingsByGroup.get(group);
    if (!standings) return null;
    return teamAtPosition(standings, position)?.teamId ?? null;
  }

  return slots.map(({ matchId, side, slot }) => {
    let teamId: string | null = null;

    const winners = slot.match(WINNERS_RE);
    if (winners) {
      teamId = teamIdByGroupPosition(winners[1].toUpperCase() as GroupLetter, 1);
    } else {
      const runners = slot.match(RUNNERS_RE);
      if (runners) {
        teamId = teamIdByGroupPosition(runners[1].toUpperCase() as GroupLetter, 2);
      } else if (THIRD_RE.test(slot)) {
        const group = thirdGroupByMatch.get(matchId);
        teamId = group ? teamIdByGroupPosition(group, 3) : null;
      }
    }

    return { matchId, side, slot, teamId };
  });
}

/** 3位スロットを持つ R32 試合IDの集合（lib/third-place 由来）。参照用に再エクスポート。 */
export const THIRD_PLACE_R32_MATCH_IDS: readonly number[] =
  THIRD_PLACE_HOST_MATCHES.map((h) => h.matchId);
