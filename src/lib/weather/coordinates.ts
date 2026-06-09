/**
 * WC2026 全16会場のスタジアム座標（緯度・経度）。
 *
 * 天気予報（#24）で WeatherAPI に `q=lat,lon` として渡す。会場の所在地は
 * Foxborough / East Rutherford / Inglewood など小さな自治体が多く、都市名検索だと
 * 取り違える恐れがあるため、座標で一意に引く。値はスタジアム位置の概略（天気用途では
 * 都市スケールで十分）。会場 id は src/data/seed-venues.ts と一致させること。
 *
 * NOTE: 本番投入前に各座標が正しい都市圏を指すか一度検証する（ターミナルで
 * `q=lat,lon` を叩き location.name を確認）。座標が必要になったら DB へ昇格してもよい。
 */
export type VenueCoordinate = { lat: number; lon: number };

export const VENUE_COORDINATES: Record<string, VenueCoordinate> = {
  atlanta: { lat: 33.755, lon: -84.401 }, // Mercedes-Benz Stadium
  bc_place_vancouver: { lat: 49.277, lon: -123.112 }, // BC Place
  boston: { lat: 42.091, lon: -71.264 }, // Gillette Stadium, Foxborough
  dallas: { lat: 32.747, lon: -97.093 }, // AT&T Stadium, Arlington
  guadalajara: { lat: 20.681, lon: -103.463 }, // Estadio Akron, Zapopan
  houston: { lat: 29.685, lon: -95.411 }, // NRG Stadium
  kansas_city: { lat: 39.049, lon: -94.484 }, // Arrowhead Stadium
  los_angeles: { lat: 33.953, lon: -118.339 }, // SoFi Stadium, Inglewood
  mexico_city: { lat: 19.303, lon: -99.15 }, // Estadio Azteca
  miami: { lat: 25.958, lon: -80.239 }, // Hard Rock Stadium, Miami Gardens
  monterrey: { lat: 25.669, lon: -100.244 }, // Estadio BBVA, Guadalupe
  new_york_new_jersey: { lat: 40.813, lon: -74.074 }, // MetLife Stadium, East Rutherford
  philadelphia: { lat: 39.901, lon: -75.168 }, // Lincoln Financial Field
  san_francisco_bay_area: { lat: 37.403, lon: -121.97 }, // Levi's Stadium, Santa Clara
  seattle: { lat: 47.595, lon: -122.332 }, // Lumen Field
  toronto: { lat: 43.633, lon: -79.419 }, // BMO Field
};

/** 会場 id から座標を引く。未登録なら null。 */
export function getVenueCoordinate(venueId: string): VenueCoordinate | null {
  return VENUE_COORDINATES[venueId] ?? null;
}
