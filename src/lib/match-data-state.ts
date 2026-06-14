import type { MatchStatus } from '@/db/queries';

import { staleThresholdMs } from '@/lib/ingest/audit';

/**
 * 公開側で「データの正直さ」を出し分けるための試合データ状態（T-82④）。
 *
 * - `confirmed`  : 確定値。バッジ無しで通常表示。
 * - `pending`    : 終了しているはずなのに未確定（KO後しきい値超過で未終了）＝結果が未取込/確認中。
 * - `provisional`: 終了済みだが得点者がスコアに足りない（中途半端）＝速報/暫定として明示。
 *
 * 鮮度しきい値は監査（[[audit]]）と同一の `staleThresholdMs` を共有し、検知と表示の基準をズラさない。
 */
export type MatchDataState = 'confirmed' | 'pending' | 'provisional';

export type MatchDataStateInput = {
  status: MatchStatus;
  stage: string;
  kickoffAt: string | null;
  matchDate: string;
  homeScore: number | null;
  awayScore: number | null;
  /**
   * 得点イベント件数（goal/penalty_goal/own_goal の合計）。
   * 件数を持つ画面（試合詳細など）でのみ渡す。未指定なら provisional 判定はしない。
   */
  goalEventCount?: number;
  /** 基準時刻。テスト用に固定可能。既定は実行時刻。 */
  now?: Date;
};

/**
 * 試合データの表示状態を判定する純関数。監査（ingest 側）と同じ基準で、
 * ユーザーに「未取込/中途半端」を確定値と誤認させないためのバッジ出し分けに使う。
 */
export function deriveMatchDataState(input: MatchDataStateInput): MatchDataState {
  const nowMs = (input.now ?? new Date()).getTime();

  // pending: 未終了なのに鮮度しきい値を過ぎている（=結果が来ているはずなのに未確定）。
  if (input.status !== 'finished') {
    const threshold = staleThresholdMs(input.stage, input.kickoffAt, input.matchDate);
    if (threshold !== null && nowMs > threshold) return 'pending';
    return 'confirmed';
  }

  // provisional: 終了済みだが得点者がスコアに足りない（件数が分かる画面でのみ判定）。
  if (
    input.goalEventCount !== undefined &&
    input.homeScore !== null &&
    input.awayScore !== null &&
    input.goalEventCount < input.homeScore + input.awayScore
  ) {
    return 'provisional';
  }

  return 'confirmed';
}
