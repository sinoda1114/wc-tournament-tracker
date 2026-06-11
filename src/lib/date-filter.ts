/**
 * グループリーグ画面の日付フィルター用ユーティリティ。
 *
 * 表示は JST（Asia/Tokyo）基準で統一する（`formatKickoffJst` と一貫）。
 * URL クエリ `?date=YYYY-MM-DD` に対応する純粋関数のみを公開する。
 */

export type DateFilterValue =
  | { kind: 'all' }
  | { kind: 'date'; date: string };

const JST_TIMEZONE = 'Asia/Tokyo';
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const jstDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: JST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * JST 基準で `YYYY-MM-DD` を返す。日付境界は JST の 00:00 に従う。
 * 注意: テスト容易性のため `now` を任意に差し替えられる。
 */
export function todayJst(now: Date = new Date()): string {
  return jstDateFormatter.format(now);
}

/**
 * JST 基準の翌日。
 */
export function tomorrowJst(now: Date = new Date()): string {
  return addDaysJst(todayJst(now), 1);
}

/**
 * JST 基準の明後日。
 */
export function dayAfterTomorrowJst(now: Date = new Date()): string {
  return addDaysJst(todayJst(now), 2);
}

/** 指定TZ（観戦者ローカル）基準の現在暦日 YYYY-MM-DD（不正TZ時はJST）。 */
export function todayInZone(timeZone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return todayJst(now);
  }
}

/** YYYY-MM-DD に日数を加算（TZ非依存の純粋な日付計算）。 */
export function addDays(ymd: string, days: number): string {
  return addDaysJst(ymd, days);
}

/**
 * URL クエリの `date=...` をパースする。形式不正・存在しない日付は `all` とみなす。
 *
 * これにより `?date=invalid` や `?date=2026-13-50` で SSR が落ちないことを保証する。
 */
export function parseDateParam(
  param: string | null | undefined,
): DateFilterValue {
  if (!param) return { kind: 'all' };

  const match = param.match(ISO_DATE_PATTERN);
  if (!match) return { kind: 'all' };

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!isValidYmd(year, month, day)) {
    return { kind: 'all' };
  }

  return { kind: 'date', date: param };
}

/**
 * `DateFilterValue` を URL クエリ値へシリアライズする。
 * `all` は `null` を返し、呼び出し側は `?date=` を削除する想定。
 */
export function serializeDateParam(value: DateFilterValue): string | null {
  if (value.kind === 'all') return null;
  return value.date;
}

/**
 * `kickoffAt`（TZ 付き ISO）を JST 暦日 `YYYY-MM-DD` に変換する。
 *
 * 表示（`formatKickoffJst` の時刻）とフィルタを JST 基準で統一するための
 * 単一の変換点。`matchDate` は会場ローカル暦日なので、米国の夜キックオフは
 * JST では翌日になる（例: 決勝 7/19 15:00 ET → JST 7/20）。
 *
 * `kickoffAt` が null/不正な場合は null を返す（呼び出し側で `matchDate`
 * へフォールバックする想定）。
 */
export function toJstYmd(kickoffAt: string | null | undefined): string | null {
  if (!kickoffAt) return null;
  const d = new Date(kickoffAt);
  if (Number.isNaN(d.getTime())) return null;
  return jstDateFormatter.format(d);
}

/**
 * `kickoffAt`（TZ 付き ISO）を任意 TZ の暦日 `YYYY-MM-DD` に変換する。
 * 表示TZ（観戦者ローカル）で「日付」と「時刻」を一致させるための変換点。
 * null/不正・不正TZ は null。
 */
export function toZonedYmd(
  kickoffAt: string | null | undefined,
  timeZone: string,
): string | null {
  if (!kickoffAt) return null;
  const d = new Date(kickoffAt);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return null;
  }
}

/**
 * 試合配列を JST 暦日で絞り込む。
 *
 * 基準は `kickoffAt` を JST に変換した暦日（`toJstYmd`）。`kickoffAt` が
 * 無い場合のみ会場ローカルの `matchDate` にフォールバックする。これにより
 * 「今日/明日の試合」フィルタが時刻表示（JST）と一致する。
 */
export function filterMatchesByDate<
  T extends { matchDate: string; kickoffAt?: string | null },
>(matches: T[], filter: DateFilterValue): T[] {
  if (filter.kind === 'all') return matches;
  return matches.filter(
    (m) => (toJstYmd(m.kickoffAt) ?? m.matchDate) === filter.date,
  );
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * JST 基準の `YYYY-MM-DD` に日数を足す。Date 構築時に UTC を介すが、
 * 入力日と同じ「JST 上の暦日」を維持する。
 */
function addDaysJst(ymd: string, days: number): string {
  const match = ymd.match(ISO_DATE_PATTERN);
  if (!match) return ymd;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + days);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, '0');
  const d = String(base.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 複数日選択の上限（URL長と描画コストの抑制）。 */
const MAX_SELECTED_DATES = 14;

/**
 * URL クエリ `?date=YYYY-MM-DD,YYYY-MM-DD,...` を日付配列にパースする（#37 複数日対応）。
 * 不正な要素は捨て、重複除去・昇順ソート・上限 MAX_SELECTED_DATES 件に正規化する。
 * 単一日付（従来形式）も要素1の配列として扱える後方互換。
 */
export function parseDatesParam(param: string | null | undefined): string[] {
  if (!param) return [];
  const valid = param
    .split(',')
    .map((p) => p.trim())
    .filter((p) => parseDateParam(p).kind === 'date');
  return [...new Set(valid)].sort().slice(0, MAX_SELECTED_DATES);
}

/** 日付配列を URL クエリ値へ。空配列は null（`?date=` を削除する想定）。 */
export function serializeDatesParam(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.join(',');
}

/**
 * 試合配列を複数の暦日（JST基準・`filterMatchesByDate` と同じ規則）で絞り込む。
 * 空配列は「すべて」を意味しそのまま返す。
 */
export function filterMatchesByDates<
  T extends { matchDate: string; kickoffAt?: string | null },
>(matches: T[], dates: string[]): T[] {
  if (dates.length === 0) return matches;
  const set = new Set(dates);
  return matches.filter((m) => set.has(toJstYmd(m.kickoffAt) ?? m.matchDate));
}
