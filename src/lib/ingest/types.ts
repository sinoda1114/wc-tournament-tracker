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
  /**
   * この結果の取得元。複数ソースを union したとき、reconcile が試合単位で優先順位を
   * 決めるのに使う（グループ戦は Wikipedia を優先＝公式に近く完全）。未指定なら無印。
   */
  source?: 'wikipedia' | 'thesportsdb';
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
 * 1試合分のイベント取得に必要な文脈。取得元ごとに使うフィールドが異なる:
 *  - TheSportsDB は `externalEventId`（lookuptimeline のキー）だけを使う。
 *  - Wikipedia は `stage`/`groupLetter`/`homeCode`/`awayCode`（記事と試合の特定）を使う。
 * これにより「取得元が必要とする情報」を1型に集約し、provider を差し替えても run 層は無改修。
 */
export type MatchEventContext = {
  /** TheSportsDB の試合ID（lookuptimeline 用）。 */
  externalEventId: string;
  /** 'group_stage' | 'round_of_32' など。Wikipedia の記事選択に使う。 */
  stage: string;
  /** グループ文字（'A'..'L'）。グループステージ以外は null。 */
  groupLetter: string | null;
  /** 我々の home チームの FIFAコード（大文字）。Wikipedia の football box 特定/向き解決に使う。 */
  homeCode: string;
  /** 我々の away チームの FIFAコード（大文字）。 */
  awayCode: string;
};

/**
 * 試合イベント（タイムライン）の取得元。実装は任意（Partial 連携）で、
 * 持たない provider はイベント同期がスキップされるだけで結果取込は従来どおり動く。
 */
export interface MatchEventProvider {
  fetchMatchEvents(context: MatchEventContext): Promise<NormalizedMatchEvent[]>;
}

/** 結果フォールバックの対象（=主ソースが確定できなかった試合）の最小情報。 */
export type FallbackResultTarget = {
  /** 'group_stage' 等。フォールバック対応外のステージは provider 側で無視する。 */
  stage: string;
  /** グループ文字（'A'..'L'）。グループステージ以外は null。 */
  groupLetter: string | null;
  /** 我々の home チームの FIFAコード（大文字）。 */
  homeCode: string;
  /** 我々の away チームの FIFAコード（大文字）。 */
  awayCode: string;
  /** 'YYYY-MM-DD'（会場日付）。返す NormalizedResult の dateEvent に使う。 */
  matchDate: string;
};

/**
 * 主ソース（TheSportsDB）が未掲載/未確定の試合だけを対象に、補完ソース（例: Wikipedia）から
 * 結果（スコア/finished）を導出する任意機能（T-82③・単一ソース依存の緩和）。
 *
 * - run 層は「未確定の試合」だけを targets として渡すため、確定済みを上書きしない（主ソース優先）。
 * - 持たない provider では呼ばれず、取込は従来どおり動く（Partial 連携）。
 */
export interface ResultFallbackProvider {
  fetchFallbackResults(targets: FallbackResultTarget[]): Promise<NormalizedResult[]>;
}
