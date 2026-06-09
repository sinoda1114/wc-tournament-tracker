import 'server-only';

import type { VenueCoordinate } from './coordinates';

/**
 * WeatherAPI レスポンスのキャッシュ保持時間（秒）。
 * 「会場×座標」でキャッシュキーが決まるため、ユーザー数に関係なく外部コールは
 * 会場数×(24h/この秒数) に固定される。3時間ごと更新で十分。
 */
const REVALIDATE_SECONDS = 3 * 60 * 60;

/** locale → WeatherAPI lang コード。en は既定（指定なし）。 */
const LANG_BY_LOCALE: Record<string, string> = {
  ja: 'ja',
  es: 'es',
  pt: 'pt',
  zh: 'zh',
};

/**
 * 指定座標の3日予報を WeatherAPI から取得する（サーバー専用）。
 * API キー未設定・通信失敗・非 200 は null を返し、天気機能だけ無効化してサイトは落とさない。
 * key はクライアントへ出さず、レスポンス JSON にも含まれない。
 */
export async function fetchForecast(
  coord: VenueCoordinate,
  locale: string,
): Promise<unknown | null> {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: `${coord.lat},${coord.lon}`,
    days: '3',
    aqi: 'no',
    alerts: 'no',
  });
  const lang = LANG_BY_LOCALE[locale];
  if (lang) {
    params.set('lang', lang);
  }

  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?${params.toString()}`,
      { next: { revalidate: REVALIDATE_SECONDS } },
    );
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}
