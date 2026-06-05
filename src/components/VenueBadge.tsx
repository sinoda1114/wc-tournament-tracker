import type { Venue } from '@/db/queries';

import { CountryFlag } from './CountryFlag';
import { MapIcon } from './MapIcon';

type VenueBadgeProps = {
  venue: Venue;
  withMapLink?: boolean;
};

export function VenueBadge({ venue, withMapLink = false }: VenueBadgeProps) {
  const mapsQuery = `${venue.stadiumName} ${venue.city} ${venue.country}`;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <div className="wc-venue-line">
      <span className="wc-venue-line-stadium">
        <CountryFlag
          fifaCode={venue.countryCode}
          size="sm"
          ariaLabel={`${venue.country} 開催`}
        />
        <span aria-hidden>🏟️</span>
        <span>{venue.stadiumName}</span>
      </span>
      <span className="wc-venue-line-sep" aria-hidden>
        {' | '}
      </span>
      <span className="wc-venue-line-location">
        {venue.state} / {venue.city}
      </span>
      {withMapLink ? (
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
      ) : null}
    </div>
  );
}
