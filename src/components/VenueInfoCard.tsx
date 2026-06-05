import type { Venue, VenueMatchSummary } from '@/db/queries';
import {
  formatCapacity,
  formatElevation,
  formatPastWorldCups,
  formatVenueStageSummary,
  isHighAltitude,
  roofTypeLabel,
  surfaceLabel,
} from '@/lib/venue';

import { CountryFlag } from './CountryFlag';
import { MapIcon } from './MapIcon';

type VenueInfoCardProps = {
  venue: Venue;
  summary: VenueMatchSummary;
};

/**
 * 試合詳細ページ用の会場情報カード。
 * 収容人数・屋根/芝・標高（高地強調）・この大会での担当試合・過去W杯開催歴を表示し、
 * 末尾に Googleマップへのリンクを置く。
 */
export function VenueInfoCard({ venue, summary }: VenueInfoCardProps) {
  const mapsQuery = `${venue.stadiumName} ${venue.city} ${venue.country}`;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  const capacity = formatCapacity(venue.capacity);
  const roof = roofTypeLabel(venue.roofType);
  const elevation = formatElevation(venue.elevationM);
  const highAltitude = isHighAltitude(venue.elevationM);
  const pastWorldCups = formatPastWorldCups(venue.pastWorldCups);
  const stageSummary = formatVenueStageSummary(summary);

  return (
    <section
      className="wc-venue-card"
      aria-label={`${venue.stadiumName} の会場情報`}
    >
      <header className="wc-venue-card-header">
        <CountryFlag
          fifaCode={venue.countryCode}
          size="lg"
          ariaLabel={`${venue.country} 開催`}
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
            <dt>収容人数</dt>
            <dd>{capacity}人</dd>
          </div>
        ) : null}
        {roof ? (
          <div className="wc-venue-card-item">
            <dt>屋根</dt>
            <dd>{roof}</dd>
          </div>
        ) : null}
        <div className="wc-venue-card-item">
          <dt>ピッチ</dt>
          <dd>{surfaceLabel(venue.roofType)}</dd>
        </div>
        {elevation ? (
          <div className="wc-venue-card-item">
            <dt>標高</dt>
            <dd>
              {elevation}
              {highAltitude ? (
                <span className="wc-venue-altitude-badge">高地</span>
              ) : null}
            </dd>
          </div>
        ) : null}
        {stageSummary ? (
          <div className="wc-venue-card-item wc-venue-card-span">
            <dt>この大会での担当</dt>
            <dd>{stageSummary}</dd>
          </div>
        ) : null}
        {pastWorldCups ? (
          <div className="wc-venue-card-item wc-venue-card-span">
            <dt>過去のW杯</dt>
            <dd>{pastWorldCups}</dd>
          </div>
        ) : null}
      </dl>

      <a
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="wc-venue-map-link"
        aria-label={`${venue.stadiumName} を Google マップで開く（新しいタブ）`}
      >
        <MapIcon />
        <span>Googleマップで開く</span>
      </a>
    </section>
  );
}
