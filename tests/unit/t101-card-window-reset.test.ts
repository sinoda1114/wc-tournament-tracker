import { describe, expect, it } from 'vitest';

import { aggregateCards, currentResetWindow, windowOf, type RankingEvent } from '@/lib/rankings';

/**
 * T-101: カードランキングのイエロー枚数を「現在のリセット窓」スコープで数える。
 * WC2026 はイエローを2回ワイプ（グループ終了後・準々決勝終了後）。
 *   W1 = group_stage / W2 = round_of_32・round_of_16・quarter_final / W3 = semi_final・third_place・final
 * レッドはリセット対象外＝常に通算。
 */

function card(
  player: string,
  fifa: string,
  color: 'yellow' | 'red',
  stage: string,
): RankingEvent {
  return {
    type: color === 'yellow' ? 'yellow_card' : 'red_card',
    playerName: player,
    teamId: fifa,
    teamFifaCode: fifa,
    teamNameEn: fifa,
    teamNameJa: fifa,
    matchId: 1,
    matchDate: '2026-06-20',
    stage,
  };
}

function match(stage: string, status: 'scheduled' | 'in_progress' | 'finished') {
  return { stage, status };
}

describe('windowOf', () => {
  it('stage をリセット窓 W1/W2/W3 に割り当てる', () => {
    expect(windowOf('group_stage')).toBe(1);
    expect(windowOf('round_of_32')).toBe(2);
    expect(windowOf('round_of_16')).toBe(2);
    expect(windowOf('quarter_final')).toBe(2);
    expect(windowOf('semi_final')).toBe(3);
    expect(windowOf('third_place')).toBe(3);
    expect(windowOf('final')).toBe(3);
  });

  it('未知 stage は 0', () => {
    expect(windowOf('unknown')).toBe(0);
  });
});

describe('currentResetWindow', () => {
  it('1試合も始まっていなければ 1（グループ）', () => {
    expect(currentResetWindow([])).toBe(1);
    expect(currentResetWindow([match('group_stage', 'scheduled')])).toBe(1);
  });

  it('グループのみ進行中/終了なら 1', () => {
    expect(currentResetWindow([match('group_stage', 'finished')])).toBe(1);
  });

  it('R32 が始まったら 2（GLが全部終わっていても窓2）', () => {
    expect(
      currentResetWindow([match('group_stage', 'finished'), match('round_of_32', 'in_progress')]),
    ).toBe(2);
  });

  it('準々決勝までは窓2', () => {
    expect(
      currentResetWindow([
        match('group_stage', 'finished'),
        match('quarter_final', 'finished'),
      ]),
    ).toBe(2);
  });

  it('準決勝が始まったら 3', () => {
    expect(
      currentResetWindow([match('quarter_final', 'finished'), match('semi_final', 'in_progress')]),
    ).toBe(3);
  });

  it('未開始(scheduled)の先のステージは窓を進めない', () => {
    expect(
      currentResetWindow([match('group_stage', 'finished'), match('round_of_32', 'scheduled')]),
    ).toBe(1);
  });
});

describe('aggregateCards（窓スコープ）', () => {
  it('窓1ではグループのイエローを数え、決勝Tのイエローは数えない', () => {
    const result = aggregateCards(
      [card('A', 'JPN', 'yellow', 'group_stage'), card('A', 'JPN', 'yellow', 'round_of_32')],
      1,
    );
    expect(result).toHaveLength(1);
    expect(result[0].yellow).toBe(1); // group の1枚のみ
  });

  it('窓2ではグループのイエローは落とし、R32/R16/準々のイエローを数える', () => {
    const result = aggregateCards(
      [
        card('A', 'JPN', 'yellow', 'group_stage'), // 過去窓 → 除外
        card('A', 'JPN', 'yellow', 'round_of_32'),
        card('A', 'JPN', 'yellow', 'quarter_final'),
      ],
      2,
    );
    expect(result).toHaveLength(1);
    expect(result[0].yellow).toBe(2); // R32 + 準々
  });

  it('窓3では準決勝以降のイエローのみ数える', () => {
    const result = aggregateCards(
      [card('A', 'JPN', 'yellow', 'quarter_final'), card('A', 'JPN', 'yellow', 'semi_final')],
      3,
    );
    expect(result).toHaveLength(1);
    expect(result[0].yellow).toBe(1); // semi のみ
  });

  it('過去窓のイエローしか無い選手は一覧から除外される', () => {
    const result = aggregateCards([card('A', 'JPN', 'yellow', 'group_stage')], 2);
    expect(result).toEqual([]);
  });

  it('レッドはリセット対象外＝窓に関係なく通算で数える', () => {
    // 窓2でも、グループの退場は残る（GL最終戦の退場→R32持ち越しを表示で消さない）。
    const result = aggregateCards([card('A', 'JPN', 'red', 'group_stage')], 2);
    expect(result).toHaveLength(1);
    expect(result[0].red).toBe(1);
    expect(result[0].yellow).toBe(0);
  });

  it('currentWindow 省略時は全期間の通算（後方互換）', () => {
    const result = aggregateCards([
      card('A', 'JPN', 'yellow', 'group_stage'),
      card('A', 'JPN', 'yellow', 'round_of_32'),
    ]);
    expect(result[0].yellow).toBe(2);
  });
});
