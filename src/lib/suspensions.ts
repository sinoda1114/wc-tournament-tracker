/**
 * 出場停止の算出（T-40・純TS・DB非依存）。
 *
 * カードイベント（`lib/rankings` の RankingEvent）と日程（fixtures）から、
 * 各選手が「次戦で出場停止か」と、その対象試合（日付・対戦相手）を求める。
 *
 * ルール（WC2026）:
 *  - 同一リセット窓で警告2枚 → 次戦出場停止。退場 → 次戦出場停止。
 *  - イエローの累積はリセット窓ごとに 0 へ戻る:
 *      W1 = グループステージ / W2 = R32・R16・準々決勝 / W3 = 準決勝・3位決定戦・決勝。
 *  - 直近トリガーの「次戦」が未消化(scheduled/in_progress)なら status='pending'（🚫 表示）。
 *    その試合が終了済みなら status='served'（消化済み）。赤(通算)・黄累積(同一窓内)とも
 *    一覧に残る間は捨てず、UI 側で「消化済み」注記に切り替える。
 *  - レッドの複数試合停止はFIFAが個別決定のため自動表示は「次戦」のみ。
 */
import {
  playerTeamKey,
  windowOf,
  type CardSuspension,
  type RankingEvent,
  type TeamRef,
} from '@/lib/rankings';

/** 出場停止判定に使う試合（日程）。listTournamentMatches() の MatchDetail から必要分だけ。 */
export type SuspensionFixture = {
  matchDate: string;
  status: 'scheduled' | 'in_progress' | 'finished';
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeam: TeamRef | null;
  awayTeam: TeamRef | null;
};

/** リセット窓ロジック（windowOf / STAGE_WINDOW）は lib/rankings に集約（T-101・循環import回避）。 */

/** team の、afterDate より後で最も早い試合（次戦）を返す。 */
function nextFixtureAfter(
  teamId: string,
  afterDate: string,
  fixtures: readonly SuspensionFixture[],
): SuspensionFixture | null {
  let best: SuspensionFixture | null = null;
  for (const f of fixtures) {
    if (f.homeTeamId !== teamId && f.awayTeamId !== teamId) continue;
    if (f.matchDate <= afterDate) continue;
    if (!best || f.matchDate < best.matchDate) best = f;
  }
  return best;
}

function opponentOf(fixture: SuspensionFixture, teamId: string): TeamRef | null {
  if (fixture.homeTeamId === teamId) return fixture.awayTeam;
  if (fixture.awayTeamId === teamId) return fixture.homeTeam;
  return null;
}

/**
 * 各選手の現在の出場停止を算出する。
 * 返り値は `playerTeamKey(playerName, fifaCode)` をキーにした Map（出場停止中の選手のみ）。
 */
export function computeSuspensions(
  events: readonly RankingEvent[],
  fixtures: readonly SuspensionFixture[],
): Map<string, CardSuspension> {
  // 選手ごとにカードイベント（黄/赤）を集める。得点系は無視。
  const byPlayer = new Map<string, { teamId: string | null; events: RankingEvent[] }>();
  for (const e of events) {
    if (e.type !== 'yellow_card' && e.type !== 'red_card') continue;
    const key = playerTeamKey(e.playerName, e.teamFifaCode);
    const entry = byPlayer.get(key) ?? { teamId: e.teamId, events: [] };
    entry.events.push(e);
    byPlayer.set(key, entry);
  }

  const result = new Map<string, CardSuspension>();
  for (const [key, { teamId, events: list }] of byPlayer) {
    if (!teamId) continue;
    list.sort((a, b) => a.matchDate.localeCompare(b.matchDate) || a.matchId - b.matchId);

    let activeYellows = 0;
    let currentWindow = -1;
    let lastBan: { matchDate: string; reason: 'red' | 'yellows' } | null = null;

    for (const e of list) {
      const w = windowOf(e.stage);
      if (w !== currentWindow) {
        activeYellows = 0;
        currentWindow = w;
      }
      if (e.type === 'yellow_card') {
        activeYellows += 1;
        if (activeYellows >= 2) {
          lastBan = { matchDate: e.matchDate, reason: 'yellows' };
          activeYellows = 0; // 2枚で停止 → 消化前提でカウントを戻す
        }
      } else {
        lastBan = { matchDate: e.matchDate, reason: 'red' };
      }
    }

    if (!lastBan) continue;
    const target = nextFixtureAfter(teamId, lastBan.matchDate, fixtures);
    if (!target) continue; // 次戦が無い（大会終了/敗退等）→ 注記なし

    // 対象試合が終了済み＝出場停止を消化済み。赤(通算)・黄累積(同一窓内)とも一覧に残る間は
    // 注記を出すため捨てずに status='served' で返し、UI 側で「消化済み」表記に切替（pending の🚫と区別）。
    result.set(key, {
      matchDate: target.matchDate,
      opponent: opponentOf(target, teamId),
      reason: lastBan.reason,
      status: target.status === 'finished' ? 'served' : 'pending',
    });
  }
  return result;
}
