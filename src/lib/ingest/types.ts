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
};

/**
 * 試合結果の取得元を抽象化するインターフェース。
 * 実装を差し替えれば（TheSportsDB → 他ソース）取り込み層は無改修で動く。
 */
export interface ResultProvider {
  fetchResults(): Promise<NormalizedResult[]>;
}
