import type { MatchEventType } from '@/db/match-events';

/** 取得元（プロバイダ）非依存に正規化した1試合分の結果。 */
export type NormalizedResult = {
  /** 'YYYY-MM-DD'（会場日付）。 */
  dateEvent: string;
  /** 取得元が返すチーム名（英語名。名寄せは team-resolver が担当）。 */
  homeName: string;
  awayName: string;
  /** 未実施はスコア null。 */
  homeScore: number | null;
  awayScore: number | null;
  /** 試合が完全に終了しているか（延期・未実施・ライブは false）。 */
  finished: boolean;
  /** 取得元の試合ID（イベントタイムライン取得用）。取得元が返さない場合は省略/null。 */
  externalEventId?: string | null;
};

/**
 * 取得元非依存に正規化した試合イベント1件（得点・カード・交代）。
 * teamId への解決は呼び出し側（reconcile の toAutoMatchEvents）が行うため、
 * ここでは取得元の home/away どちらか（isHome）だけを持つ。
 */
export type NormalizedMatchEvent = {
  type: MatchEventType;
  /** 起きた分（不明は null）。 */
  minute: number | null;
  /** 取得元の home チームの出来事なら true、away なら false、不明は null。 */
  isHome: boolean | null;
  /** 主体選手（得点者 / カード対象 / 交代IN）。 */
  playerName: string;
  /** 補助選手（アシスト / 交代OUT）。 */
  playerOut: string | null;
  /** 取得元のイベント行ID（冪等キー）。 */
  externalId: string;
};

/**
 * 試合結果の取得元を抽象化するインターフェース。
 * 実装を差し替えれば（TheSportsDB → 他ソース）取り込み層は無改修で動く。
 */
export interface ResultProvider {
  fetchResults(): Promise<NormalizedResult[]>;
}

/**
 * 試合イベント（タイムライン）の取得元。実装は任意（Partial 連携）で、
 * 持たない provider はイベント同期がスキップされるだけで結果取込は従来どおり動く。
 */
export interface MatchEventProvider {
  fetchMatchEvents(externalEventId: string): Promise<NormalizedMatchEvent[]>;
}
