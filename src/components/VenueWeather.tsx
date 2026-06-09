import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { getVenueWeather } from '@/lib/weather';
import { CONDITION_JA } from '@/lib/weather/conditions-ja';

type VenueWeatherProps = {
  venueId: string;
  /** 試合日 (YYYY-MM-DD)。WeatherAPI の予報日マッチングに使う（会場ローカル暦日）。 */
  matchDate: string;
  /** 見出しに併記する表示用の試合日（タイムゾーン整形済み。例「6/12（金）」）。 */
  dateLabel: string;
  locale: Locale;
  dict: Dictionary;
};

/**
 * 会場の試合日天気（#24）。試合の3日前から表示し、予報ウィンドウ外・座標未登録・
 * 取得失敗時は何も描画しない（null）。WeatherAPI 無料プラン・会場座標でサーバーキャッシュ。
 * async server component なので呼び出し側は <Suspense> で包むとページ本体をブロックしない。
 */
export async function VenueWeather({ venueId, matchDate, dateLabel, locale, dict }: VenueWeatherProps) {
  const weather = await getVenueWeather(venueId, matchDate);
  if (!weather) {
    return null;
  }

  const t = dict.venue.weather;
  // データは全言語共通。日本語のときだけ天候コードから日本語表記に変換（未収録は英語表記にフォールバック）。
  const conditionText =
    locale === 'ja'
      ? (CONDITION_JA[weather.conditionCode] ?? weather.conditionText)
      : weather.conditionText;
  return (
    <section className="wc-venue-weather" aria-label={t.aria}>
      <h3 className="wc-venue-weather-title">{`${t.title} : ${dateLabel}`}</h3>
      <div className="wc-venue-weather-body">
        {weather.conditionIconUrl ? (
          // 外部 CDN（WeatherAPI）の天候アイコン。寸法固定で CLS を防ぐ。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={weather.conditionIconUrl}
            alt={conditionText}
            width={56}
            height={56}
            loading="lazy"
            className="wc-venue-weather-icon"
          />
        ) : null}
        <p className="wc-venue-weather-temps">
          <span className="wc-venue-weather-temp-max">{Math.round(weather.maxTempC)}°</span>
          <span className="wc-venue-weather-temp-sep" aria-hidden="true">
            /
          </span>
          <span className="wc-venue-weather-temp-min">{Math.round(weather.minTempC)}°</span>
        </p>
        <p className="wc-venue-weather-meta">
          {conditionText ? (
            <span className="wc-venue-weather-condition">{conditionText}</span>
          ) : null}
          <span className="wc-venue-weather-rain">
            {t.chanceOfRain.replace('{n}', String(weather.chanceOfRain))}
          </span>
        </p>
      </div>
    </section>
  );
}
