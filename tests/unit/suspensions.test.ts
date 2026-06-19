import { describe, expect, it } from 'vitest';

import { playerTeamKey, type RankingEvent } from '@/lib/rankings';
import { computeSuspensions, type SuspensionFixture } from '@/lib/suspensions';

/** カードイベント生成（teamId と fifa は同値にしてテストを簡潔に）。 */
function card(
  player: string,
  team: string,
  color: 'yellow' | 'red',
  matchId: number,
  date: string,
  stage: string,
): RankingEvent {
  return {
    type: color === 'yellow' ? 'yellow_card' : 'red_card',
    playerName: player,
    teamId: team,
    teamFifaCode: team,
    teamNameEn: team,
    teamNameJa: team,
    matchId,
    matchDate: date,
    stage,
  };
}

function fixture(
  date: string,
  home: string,
  away: string,
  status: SuspensionFixture['status'] = 'scheduled',
): SuspensionFixture {
  const ref = (c: string) => ({ fifaCode: c, nameEn: c, nameJa: c });
  return {
    matchDate: date,
    status,
    homeTeamId: home,
    awayTeamId: away,
    homeTeam: ref(home),
    awayTeam: ref(away),
  };
}

const KEY = (player: string, team: string) => playerTeamKey(player, team);

describe('computeSuspensions', () => {
  it('同一窓で警告2枚 → 次戦出場停止（対戦相手つき）', () => {
    const events = [
      card('Romero', 'ARG', 'yellow', 1, '2026-06-12', 'group_stage'),
      card('Romero', 'ARG', 'yellow', 2, '2026-06-18', 'group_stage'),
    ];
    const fixtures = [
      fixture('2026-06-18', 'ARG', 'MEX', 'finished'),
      fixture('2026-06-24', 'ARG', 'BRA', 'scheduled'), // 次戦
    ];
    const result = computeSuspensions(events, fixtures);
    const s = result.get(KEY('Romero', 'ARG'));
    expect(s).toBeDefined();
    expect(s?.matchDate).toBe('2026-06-24');
    expect(s?.reason).toBe('yellows');
    expect(s?.opponent?.fifaCode).toBe('BRA');
    expect(s?.status).toBe('pending'); // 未消化（次戦が scheduled）
  });

  it('レッド → 次戦出場停止', () => {
    const events = [card('Busquets', 'ESP', 'red', 5, '2026-06-20', 'group_stage')];
    const fixtures = [fixture('2026-06-26', 'GER', 'ESP', 'scheduled')];
    const s = computeSuspensions(events, fixtures).get(KEY('Busquets', 'ESP'));
    expect(s?.reason).toBe('red');
    expect(s?.opponent?.fifaCode).toBe('GER'); // ESP の相手は home 側 GER
    expect(s?.status).toBe('pending');
  });

  it('次戦が終了済みなら status=served（対象試合つき）で返す', () => {
    // 消化済みでも一覧に残す（赤は通算記録）。注記を「消化済み」に切替えるため
    // 捨てずに status=served で返す。
    const events = [
      card('Romero', 'ARG', 'yellow', 1, '2026-06-12', 'group_stage'),
      card('Romero', 'ARG', 'yellow', 2, '2026-06-18', 'group_stage'),
    ];
    const fixtures = [fixture('2026-06-24', 'ARG', 'BRA', 'finished')]; // 既に消化
    const s = computeSuspensions(events, fixtures).get(KEY('Romero', 'ARG'));
    expect(s).toBeDefined();
    expect(s?.status).toBe('served');
    expect(s?.matchDate).toBe('2026-06-24'); // 消化した対象試合
    expect(s?.opponent?.fifaCode).toBe('BRA');
    expect(s?.reason).toBe('yellows');
  });

  it('レッドの出場停止を消化済み（次戦 finished）なら status=served', () => {
    const events = [card('Sithole', 'RSA', 'red', 1, '2026-06-11', 'group_stage')];
    const fixtures = [
      fixture('2026-06-11', 'MEX', 'RSA', 'finished'), // 退場した試合（次戦判定の対象外）
      fixture('2026-06-18', 'CZE', 'RSA', 'finished'), // 消化試合（次戦・終了済み）
      fixture('2026-06-24', 'RSA', 'KOR', 'scheduled'),
    ];
    const s = computeSuspensions(events, fixtures).get(KEY('Sithole', 'RSA'));
    expect(s?.status).toBe('served');
    expect(s?.reason).toBe('red');
    expect(s?.matchDate).toBe('2026-06-18');
    expect(s?.opponent?.fifaCode).toBe('CZE');
  });

  it('警告1枚だけなら出場停止にならない', () => {
    const events = [card('Stones', 'ENG', 'yellow', 1, '2026-06-12', 'group_stage')];
    const fixtures = [fixture('2026-06-18', 'ENG', 'USA', 'scheduled')];
    expect(computeSuspensions(events, fixtures).size).toBe(0);
  });

  it('窓をまたぐ警告（グループ1枚＋R32で1枚）はリセットされ停止にならない', () => {
    const events = [
      card('X', 'FRA', 'yellow', 1, '2026-06-12', 'group_stage'),
      card('X', 'FRA', 'yellow', 2, '2026-06-30', 'round_of_32'),
    ];
    const fixtures = [fixture('2026-07-04', 'FRA', 'POR', 'scheduled')];
    expect(computeSuspensions(events, fixtures).size).toBe(0);
  });

  it('R32とR16の警告2枚は同一窓（W2）なので準々決勝で出場停止', () => {
    const events = [
      card('Y', 'POR', 'yellow', 1, '2026-06-30', 'round_of_32'),
      card('Y', 'POR', 'yellow', 2, '2026-07-04', 'round_of_16'),
    ];
    const fixtures = [fixture('2026-07-10', 'POR', 'NED', 'scheduled')];
    const s = computeSuspensions(events, fixtures).get(KEY('Y', 'POR'));
    expect(s?.matchDate).toBe('2026-07-10');
    expect(s?.opponent?.fifaCode).toBe('NED');
  });

  it('team 不明（teamId null）の選手は対象外', () => {
    const e: RankingEvent = {
      ...card('Z', 'X', 'red', 1, '2026-06-20', 'group_stage'),
      teamId: null,
    };
    expect(computeSuspensions([e], []).size).toBe(0);
  });
});
