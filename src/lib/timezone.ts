/**
 * 表示タイムゾーン（観戦者ローカル）の解決ユーティリティ。
 * 言語（locale）とは独立。client/server 双方から import できるよう next/headers は含めない。
 *
 * - 既定は Asia/Tokyo（cookie 未設定時のフォールバック。検出後は wc_tz cookie で上書き）。
 * - データは kickoffAt（TZ 付き ISO=UTC 相当の瞬間）で保持し、表示時にこの TZ へ整形する。
 */

/** 表示 TZ を保持する cookie 名（locale の wc_locale と同方式）。 */
export const TZ_COOKIE = 'wc_tz';

/** cookie 未設定・検出失敗時のフォールバック TZ。 */
export const DEFAULT_TIME_ZONE = 'Asia/Tokyo';

/** Intl で解釈できる IANA TZ かを検証する。 */
export function isValidTimeZone(tz: string | null | undefined): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** ブラウザのローカル TZ を検出する（client 専用。失敗時は既定）。 */
export function detectTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/**
 * 指定 TZ の短縮表記（例: JST / EDT / GMT-3）。時刻の隣に併記する。
 * 夏時間で変わるため対象日時 `at` で算出する。
 */
export function tzAbbrev(timeZone: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(at);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/** 手動切替ピッカーに出す代表 TZ（都市名は普遍的な英語表記で固定）。 */
export const COMMON_TIME_ZONES: { value: string; label: string }[] = [
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Seoul', label: 'Seoul' },
  { value: 'Asia/Shanghai', label: 'Beijing / Shanghai' },
  { value: 'Asia/Kolkata', label: 'India' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Europe/Moscow', label: 'Moscow / Riyadh' },
  { value: 'Europe/Paris', label: 'Madrid / Paris / Rome' },
  { value: 'Europe/London', label: 'London / Lisbon' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/Sao_Paulo', label: 'São Paulo / Buenos Aires' },
  { value: 'America/New_York', label: 'New York / Toronto' },
  { value: 'America/Chicago', label: 'Chicago / Bogotá / Lima' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Denver', label: 'Denver' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Pacific/Auckland', label: 'Auckland' },
];

/**
 * GMT±オフセット表記（例: GMT+9 / GMT-4 / GMT+5:30）。全 TZ で一貫した形で出る
 * （tzAbbrev は JST/EDT 等の略号になり TZ により +- が出ないため、ピッカーではこちらを使う）。
 */
export function tzOffset(timeZone: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(at);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/** TZ の都市ラベル（COMMON_TIME_ZONES にあればそれ、無ければ IANA 末尾を整形）。 */
export function tzCityLabel(timeZone: string): string {
  const found = COMMON_TIME_ZONES.find((z) => z.value === timeZone);
  if (found) return found.label;
  const seg = timeZone.split('/').pop() ?? timeZone;
  return seg.replace(/_/g, ' ');
}
