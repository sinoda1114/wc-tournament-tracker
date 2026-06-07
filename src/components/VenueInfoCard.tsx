import type { Venue, VenueMatchSummary } from '@/db/queries';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import {
  formatCapacity,
  formatElevation,
  formatPastWorldCups,
  formatVenueStageSummary,
  isHighAltitude,
  roofTypeLabel,
} from '@/lib/venue';

import { CountryFlag } from './CountryFlag';
import { MapIcon } from './MapIcon';

type VenueInfoCardProps = {
  venue: Venue;
  summary: VenueMatchSummary;
  locale: Locale;
  dict: Dictionary;
};

/**
 * 試合詳細ページ用の会場情報カード。
 * 収容人数・屋根/芝・標高（高地強調）・この大会での担当試合・過去W杯開催歴を表示し、
 * 末尾に Googleマップへのリンクを置く。ja は日本語、それ以外は英語で統一。
 */
export function VenueInfoCard({ venue, summary, locale, dict }: VenueInfoCardProps) {
  const t = dict.venue;
  const mapsQuery = `${venue.stadiumName} ${venue.city} ${venue.country}`;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  const capacity = formatCapacity(venue.capacity);
  const roof = roofTypeLabel(venue.roofType, locale);
  const elevation = formatElevation(venue.elevationM, locale);
  const highAltitude = isHighAltitude(venue.elevationM);
  const pastWorldCups = formatPastWorldCups(venue.pastWorldCups, locale);
  const stageSummary = formatVenueStageSummary(summary, locale);

  return (
    <section
      className="wc-venue-card"
      aria-label={t.cardAria.replace('{stadium}', venue.stadiumName)}
    >
      <header className="wc-venue-card-header">
        <CountryFlag
          fifaCode={venue.countryCode}
          size="lg"
          ariaLabel={dict.match.venueHostingAria.replace('{country}', venue.country)}
        />
        <div className="wc-venue-card-heading">
          <h2 className="wc-venue-card-name">{venue.stadiumName}</h2>
          <p className="wc-venue-card-location">
            {venue.country} · {venue.state} / {venue.city}
          </p>
        </div>
      </header>

      <dl className="wc-venue-card-grid">
        {capacity ? (
          <div className="wc-venue-card-item">
            <dt>{t.capacity}</dt>
            <dd>
              {capacity}
              {t.capacityUnit}
            </dd>
          </div>
        ) : null}
        {roof ? (
          <div className="wc-venue-card-item">
            <dt>{t.roof}</dt>
            <dd>{roof}</dd>
          </div>
        ) : null}
        {elevation ? (
          <div className="wc-venue-card-item">
            <dt>{t.elevation}</dt>
            <dd>
              {elevation}
              {highAltitude ? (
                <span className="wc-venue-altitude-badge">{t.highAltitude}</span>
              ) : null}
            </dd>
          </div>
        ) : null}
        {stageSummary ? (
          <div className="wc-venue-card-item wc-venue-card-span">
            <dt>{t.stageSummary}</dt>
            <dd>{stageSummary}</dd>
          </div>
        ) : null}
        {pastWorldCups ? (
          <div className="wc-venue-card-item wc-venue-card-span">
            <dt>{t.pastWorldCups}</dt>
            <dd>{pastWorldCups}</dd>
          </div>
        ) : null}
      </dl>

      <a
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="wc-venue-map-link"
        aria-label={t.mapAria.replace('{stadium}', venue.stadiumName)}
      >
        <MapIcon />
        <span>{t.mapLink}</span>
      </a>
    </section>
  );
}
