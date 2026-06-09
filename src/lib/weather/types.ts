/** 正規化済みの会場天気予報（表示用）。 */
export type WeatherForecast = {
  /** 予報対象の試合日 (YYYY-MM-DD)。 */
  date: string;
  /** その日の最高気温（摂氏）。 */
  maxTempC: number;
  /** その日の最低気温（摂氏）。 */
  minTempC: number;
  /** 天候の説明テキスト（WeatherAPI が lang に応じてローカライズ）。 */
  conditionText: string;
  /** 天候アイコンの絶対 URL（https 補完済み）。空文字なら非表示。 */
  conditionIconUrl: string;
  /** 降水確率（0–100）。 */
  chanceOfRain: number;
};
