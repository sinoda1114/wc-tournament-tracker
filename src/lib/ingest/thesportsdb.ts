import type { NormalizedResult, ResultProvider } from './types';

/** FIFA World Cup のリーグID（TheSportsDB）。 */
const WORLD_CUP_LEAGUE_ID = 4429;
/** 取得する日付ウィンドウの既定日数（当日から過去へ）。 */
const DEFAULT_WINDOW_DAYS = 3;

/** TheSportsDB の生イベント1件（必要フィールドのみ）。 */
type RawEvent = {
  dateEvent?: string | null;
  strHomeTeam?: string | null;
  strAwayTeam?: string | null;
  intHomeScore?: string | number | null;
  intAwayScore?: string | number | null;
  strStatus?: string | null;
  strPostponed?: string | null;
};

function parseScore(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

const NOT_STARTED = /^(ns|not started|tbd|time to be defined)$/i;
// ライブ進行中の代表的なステータス（前半 1H, 後半 2H, ハーフタイム HT, 延長 ET, PK P, 分表示 45'）。
const LIVE = /^(1h|2h|ht|et|p|pen|live|half\s*time|\d{1,3}'?)$/i;

function isFinished(
  homeScore: number | null,
  awayScore: number | null,
  status: string,
  postponed: string,
): boolean {
  if (postponed.toLowerCase() === 'yes') return false;
  if (homeScore === null || awayScore === null) return false;
  const s = status.trim().toLowerCase();
  if (NOT_STARTED.test(s)) return false;
  if (LIVE.test(s)) return false;
  // スコアが揃っていて延期/未実施/ライブでない → 終了とみなす（空ステータスの過去試合も許容）。
  return true;
}

/**
 * TheSportsDB の生JSON（`{ events: [...] }`）を NormalizedResult[] に変換する純関数。
 * ネットワークI/Oを持たないので fixture で単体テストできる。
 */
export function parseTheSportsDbEvents(raw: unknown): NormalizedResult[] {
  const events = (raw as { events?: unknown } | null)?.events;
  if (!Array.isArray(events)) return [];

  const results: NormalizedResult[] = [];
  for (const e of events as RawEvent[]) {
    if (!e || !e.dateEvent || !e.strHomeTeam || !e.strAwayTeam) continue;
    const homeScore = parseScore(e.intHomeScore);
    const awayScore = parseScore(e.intAwayScore);
    results.push({
      dateEvent: e.dateEvent,
      homeName: e.strHomeTeam,
      awayName: e.strAwayTeam,
      homeScore,
      awayScore,
      finished: isFinished(homeScore, awayScore, e.strStatus ?? '', e.strPostponed ?? ''),
    });
  }
  return results;
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * 当日（UTC）から過去 `days` 日分の 'YYYY-MM-DD' を古い順で返す純関数。
 * デイリーcronでは直近数日を取り直せば、新たに終了した試合を冪等に拾える。
 */
export function recentDates(days: number, today: Date = new Date()): string[] {
  const n = Number.isFinite(days) && days > 0 ? Math.floor(days) : DEFAULT_WINDOW_DAYS;
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(toUtcDateString(d));
  }
  return dates;
}

type TheSportsDbOptions = {
  key?: string;
  /** 取得対象日（'YYYY-MM-DD'）。未指定なら直近 window 日を使う。 */
  dates?: string[];
};

/**
 * TheSportsDB を取得元とする ResultProvider 実装。
 *
 * 無料の eventsseason は先頭15件しか返さないため、`eventsday.php?d=<date>&l=4429`
 * を日付ウィンドウぶん呼び、その日の全W杯試合を取得して連結する。
 * ウィンドウ日数は env `INGEST_WINDOW_DAYS`（既定3）で調整可能（初回バックフィル時など）。
 */
export function createTheSportsDbProvider(
  options: TheSportsDbOptions = {},
): ResultProvider {
  const key = options.key ?? process.env.THESPORTSDB_KEY ?? '3';
  const windowDays = Number.parseInt(
    process.env.INGEST_WINDOW_DAYS ?? String(DEFAULT_WINDOW_DAYS),
    10,
  );

  return {
    async fetchResults() {
      const dates = options.dates ?? recentDates(windowDays);
      const all: NormalizedResult[] = [];
      for (const date of dates) {
        const url = `https://www.thesportsdb.com/api/v1/json/${key}/eventsday.php?d=${date}&l=${WORLD_CUP_LEAGUE_ID}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) {
          throw new Error(`TheSportsDB fetch failed (${date}): ${res.status} ${res.statusText}`);
        }
        const raw = await res.json();
        all.push(...parseTheSportsDbEvents(raw));
      }
      return all;
    },
  };
}
