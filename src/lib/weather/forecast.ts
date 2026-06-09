import type { WeatherForecast } from './types';

/** WeatherAPI 無料プランの予報提供日数（当日含め3日先まで）。 */
export const FORECAST_WINDOW_DAYS = 3;

const MS_PER_DAY = 86_400_000;

/**
 * 試合日が予報ウィンドウ内か判定する。today を基準に [today, today+(windowDays-1)] を対象。
 * 日付は YYYY-MM-DD（暦日）として UTC 正午でなく 0時で素直に差分を取る。
 */
export function isWithinForecastWindow(
  matchDate: string,
  today: string,
  windowDays: number = FORECAST_WINDOW_DAYS,
): boolean {
  const match = Date.parse(`${matchDate}T00:00:00Z`);
  const base = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(match) || Number.isNaN(base)) {
    return false;
  }
  const diffDays = Math.round((match - base) / MS_PER_DAY);
  return diffDays >= 0 && diffDays <= windowDays - 1;
}

/** WeatherAPI のアイコン URL は先頭が `//` のことがあるため https を補う。 */
export function normalizeIconUrl(icon: string): string {
  if (!icon) {
    return '';
  }
  if (icon.startsWith('http://') || icon.startsWith('https://')) {
    return icon;
  }
  if (icon.startsWith('//')) {
    return `https:${icon}`;
  }
  return `https://${icon}`;
}

/** unknown から number を安全に取り出す（数値でなければ null）。 */
function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** unknown から string を安全に取り出す。 */
function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * WeatherAPI forecast.json のレスポンスから、指定日の予報を取り出して正規化する。
 * 該当日が無い・必要フィールド欠落なら null。外部データを信頼せず型を都度確認する。
 */
export function parseForecastForDate(
  payload: unknown,
  matchDate: string,
): WeatherForecast | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const forecast = (payload as { forecast?: unknown }).forecast;
  if (typeof forecast !== 'object' || forecast === null) {
    return null;
  }
  const days = (forecast as { forecastday?: unknown }).forecastday;
  if (!Array.isArray(days)) {
    return null;
  }

  const target = days.find(
    (d) =>
      typeof d === 'object' &&
      d !== null &&
      (d as { date?: unknown }).date === matchDate,
  );
  if (!target) {
    return null;
  }

  const day = (target as { day?: unknown }).day;
  if (typeof day !== 'object' || day === null) {
    return null;
  }
  const d = day as Record<string, unknown>;

  const maxTempC = asNumber(d.maxtemp_c);
  const minTempC = asNumber(d.mintemp_c);
  if (maxTempC === null || minTempC === null) {
    return null;
  }

  const condition = d.condition;
  const conditionText =
    typeof condition === 'object' && condition !== null
      ? asString((condition as { text?: unknown }).text)
      : '';
  const conditionIcon =
    typeof condition === 'object' && condition !== null
      ? asString((condition as { icon?: unknown }).icon)
      : '';
  const conditionCode =
    typeof condition === 'object' && condition !== null
      ? (asNumber((condition as { code?: unknown }).code) ?? 0)
      : 0;
  const chanceOfRain = asNumber(d.daily_chance_of_rain) ?? 0;

  return {
    date: matchDate,
    maxTempC,
    minTempC,
    conditionCode,
    conditionText,
    conditionIconUrl: normalizeIconUrl(conditionIcon),
    chanceOfRain,
  };
}
