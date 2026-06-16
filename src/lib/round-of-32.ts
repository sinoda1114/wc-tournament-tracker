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

/** 1グループの順位表が「消化完了」か（4チームが全員 3 試合以上を終えた）。 */
function isGroupComplete(standings: readonly GroupStanding[]): boolean {
  return standings.length === 4 && standings.every((s) => s.played >= 3);
}

/**
 * 順位表上で a が b より「1次キー（勝点 → 得失点差 → 総得点）で厳密に上位」か。
 * すべて同値なら false＝この2チームは本実装スコープでは分離できていない。
 * a は b より上位（position が小さい）であることを前提に呼ぶ。
 */
function strictlyAbove(a: GroupStanding, b: GroupStanding): boolean {
  if (a.points !== b.points) return a.points > b.points;
  if (a.goalDifference !== b.goalDifference) return a.goalDifference > b.goalDifference;
  return a.goalsFor > b.goalsFor;
}

/**
 * ベスト3位ランキングで「上位8と9位の境界」が分離して確定しているか。
 *
 * グループ間の3位比較には直接対決（h2h）の概念が無く、{@link rankThirdPlacedTeams} は
 * FIFA 基準の上位（勝点/得失/得点）までしか解決しない。したがって 8位と9位が 1次キーで
 * 厳密に分離しているときだけカットオフ確定とみなし、完全同点（以降のフェアプレー/ランキング/
 * 抽選でしか割れない）なら**未確定**として3位枠を出さない（T-104 達成条件④）。
 * 3位が8組以下なら9位が存在せずカットオフは自明確定。
 */
function isThirdPlaceCutoffDecided(
  ranked: readonly { group: GroupLetter; standing: GroupStanding }[],
): boolean {
  if (ranked.length < 8) return false;
  if (ranked.length === 8) return true;
  return strictlyAbove(ranked[7].standing, ranked[8].standing);
}

/**
 * R32 の各スロットを teamId へ解決する純関数（T-104: 確定したチームから順次反映）。
 *
 * - 'Group X winners' / 'Group X runners-up' は、**そのグループが消化完了した時点**で
 *   {@link calculateGroupStandings} の position（1位/2位）を信頼して解決する（全12組の消化を
 *   待たない）。standings は勝点→得失→得点→直接対決まで解決済みで、完了グループの順位は確定値。
 * - third place スロットは全12組消化（{@link isGroupStageComplete}）かつ上位8の
 *   カットオフ確定（{@link isThirdPlaceCutoffDecided}）が揃って初めて、
 *   {@link rankThirdPlacedTeams}→{@link assignThirdPlaceSlots}（FIFA 公式割当）で解決する。
 *   割当は8グループ前提のため、3位の他組比較が定まる全消化後にのみ成立する。
 * - 確定していないスロットは teamId=null（UI は slot ラベルのプレースホルダを表示）。部分適用・冪等。
 *
 * **誤表示しない原則**: {@link calculateGroupStandings} は未消化でも同点 0-0-0 に position 1..4 を
 * 機械的に振るため、消化完了をゲートにしないと「暫定首位」を前倒し bind してしまう
 * （本番 R32 がグループ未確定なのに実チームを保持していた T-46 の再充填バグの根因）。
 * 以前の「全12組消化まで一切表示しない（6/29 開始日まで空欄）」方針は T-104 で撤回し、
 * **確定したグループから順次 1位/2位を埋める**方式へ変更した（3位通過枠の確定単位は据え置き）。
 *
 * @param slots R32 の全スロット（home/away 各16）。
 * @param groups 最大12グループ分の順位表。
 */
export function resolveRoundOf32Assignments(
  slots: readonly RoundOf32Slot[],
  groups: readonly GroupStandingsEntry[],
): SlotResolution[] {
  const standingsByGroup = new Map<GroupLetter, GroupStanding[]>();
  for (const { group, standings } of groups) {
    standingsByGroup.set(group, standings);
  }

  // 3位通過枠は全12組消化＋カットオフ確定後にのみ成立（他組比較が定まらないと割当不能）。
  const allGroupsComplete = isGroupStageComplete(groups);
  const ranked = allGroupsComplete ? rankThirdPlacedTeams(groups) : [];
  const thirdAssignment =
    allGroupsComplete && isThirdPlaceCutoffDecided(ranked)
      ? assignThirdPlaceSlots(ranked.slice(0, 8).map((r) => r.group))
      : null;

  // matchId → 割り当てられた3位グループ。
  const thirdGroupByMatch = new Map<number, GroupLetter>();
  if (thirdAssignment) {
    for (const a of thirdAssignment) thirdGroupByMatch.set(a.matchId, a.thirdPlaceGroup);
  }

  /** そのグループが消化完了していれば position の teamId、未消化/未投入なら null。 */
  function teamIdIfDecided(group: GroupLetter, position: number): string | null {
    const standings = standingsByGroup.get(group);
    if (!standings) return null;
    if (!isGroupComplete(standings)) return null;
    return teamAtPosition(standings, position)?.teamId ?? null;
  }

  return slots.map(({ matchId, side, slot }) => {
    let teamId: string | null = null;

    const winners = slot.match(WINNERS_RE);
    if (winners) {
      teamId = teamIdIfDecided(winners[1].toUpperCase() as GroupLetter, 1);
    } else {
      const runners = slot.match(RUNNERS_RE);
      if (runners) {
        teamId = teamIdIfDecided(runners[1].toUpperCase() as GroupLetter, 2);
      } else if (THIRD_RE.test(slot)) {
        const group = thirdGroupByMatch.get(matchId);
        // 3位枠は全消化＋カットオフ確定後のみ thirdGroupByMatch が埋まる。
        teamId = group ? teamIdIfDecided(group, 3) : null;
      }
    }

    return { matchId, side, slot, teamId };
  });
}

/** 3位スロットを持つ R32 試合IDの集合（lib/third-place 由来）。参照用に再エクスポート。 */
export const THIRD_PLACE_R32_MATCH_IDS: readonly number[] =
  THIRD_PLACE_HOST_MATCHES.map((h) => h.matchId);

/**
 * グループステージが「全12組とも消化済み」かどうか（＝順位が結果として確定したか）。
 * 各グループ4チームがそれぞれ3試合を終えていれば確定とみなす（#33 の着色トリガー）。
 */
export function isGroupStageComplete(groups: readonly GroupStandingsEntry[]): boolean {
  if (groups.length < 12) return false;
  return groups.every(
    (g) => g.standings.length === 4 && g.standings.every((s) => s.played >= 3),
  );
}

/**
 * 各グループの3位が「ベスト3位上位8」に入って決勝T進出が確定したかを返す（#33）。
 *
 * - グループステージ未確定（全消化前）は判定不能として**全グループ null**。
 * - 確定後は上位8グループの3位が `true`（進出）、残り4グループが `false`（敗退）。
 *
 * 3位の通過は他グループとの比較（{@link rankThirdPlacedTeams}）でしか決まらないため、
 * 全消化後にのみ結果整合で確定する。1位/2位は各グループ内で確定するので本関数では扱わない
 * （呼び出し側が「確定後は position<=2 を進出」として着色する）。
 */
export function resolveThirdPlaceQualification(
  groups: readonly GroupStandingsEntry[],
): Map<GroupLetter, boolean | null> {
  const result = new Map<GroupLetter, boolean | null>();
  if (!isGroupStageComplete(groups)) {
    for (const g of groups) result.set(g.group, null);
    return result;
  }
  const top8 = new Set(
    rankThirdPlacedTeams(groups)
      .slice(0, 8)
      .map((r) => r.group),
  );
  for (const g of groups) result.set(g.group, top8.has(g.group));
  return result;
}
