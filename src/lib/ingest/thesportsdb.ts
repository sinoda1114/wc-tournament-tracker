import type {
  MatchEventProvider,
  NormalizedMatchEvent,
  NormalizedResult,
  ResultProvider,
} from './types';

/** FIFA World Cup のリーグID（TheSportsDB）。 */
const WORLD_CUP_LEAGUE_ID = 4429;
/** 取得する日付ウィンドウの既定日数（当日から過去へ）。 */
const DEFAULT_WINDOW_DAYS = 3;
/** タイムライン取得のリクエスト間隔（ms）。無料キーのレート制限（約30req/分）対策。 */
const TIMELINE_REQUEST_INTERVAL_MS = 600;

/** TheSportsDB の生イベント1件（必要フィールドのみ）。 */
type RawEvent = {
  idEvent?: string | number | null;
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
      externalEventId:
        e.idEvent === null || e.idEvent === undefined || e.idEvent === ''
          ? null
          : String(e.idEvent),
    });
  }
  return results;
}

/** TheSportsDB の生タイムライン1件（lookuptimeline.php、必要フィールドのみ）。 */
type RawTimelineItem = {
  idTimeline?: string | number | null;
  /** 大分類: 'Goal' | 'Card' | 'subst' | 'Var' など。 */
  strTimeline?: string | null;
  /** 詳細: 'Normal Goal' | 'Own Goal' | 'Penalty' | 'Yellow Card' | 'Red Card' など。 */
  strTimelineDetail?: string | null;
  /** 取得元の home チーム側なら 'Yes'。 */
  strHome?: string | null;
  intTime?: string | number | null;
  strPlayer?: string | null;
  strAssist?: string | null;
};

/** DB の CHECK (minute 0..130) に合わせて丸める。"45+2" は先頭の数値（45）を採用。 */
function parseMinute(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0 || n > 130) return null;
  return n;
}

/**
 * 1件のタイムライン行をイベント種別に分類する。対象外（VAR・PK失敗・詳細不明カード等）は null。
 * 種別対応:
 *   Goal × 'Own Goal' → own_goal / Goal × 'Penalty'（Missed 除く）→ penalty_goal / Goal → goal
 *   Card × 'Red'      → red_card / Card × 'Yellow' → yellow_card（Second Yellow も黄として表示）
 *   subst             → substitution
 */
function classifyTimelineType(
  timeline: string,
  detail: string,
): NormalizedMatchEvent['type'] | null {
  const kind = timeline.trim().toLowerCase();
  const d = detail.trim().toLowerCase();
  if (kind === 'goal') {
    if (d.includes('missed')) return null; // PK失敗は得点ではない
    if (d.includes('own')) return 'own_goal';
    if (d.includes('penalty')) return 'penalty_goal';
    return 'goal';
  }
  if (kind === 'card') {
    if (d.includes('red')) return 'red_card';
    if (d.includes('yellow')) return 'yellow_card';
    return null; // 詳細不明のカードは取り込まない（誤判定防止）
  }
  if (kind === 'subst') return 'substitution';
  return null;
}

/**
 * TheSportsDB の生JSON（`{ timeline: [...] }`）を NormalizedMatchEvent[] に変換する純関数。
 * ネットワークI/Oを持たないので fixture で単体テストできる。
 * - 交代は strPlayer=IN / strAssist=OUT、得点は strAssist=アシスト として playerOut に入れる。
 * - 選手名が空の行は player_name NOT NULL のためスキップ。
 * - idTimeline 欠落時は位置ベース（tl-<index>）の externalId を振る（試合内で一意）。
 */
export function parseTheSportsDbTimeline(raw: unknown): NormalizedMatchEvent[] {
  const timeline = (raw as { timeline?: unknown } | null)?.timeline;
  if (!Array.isArray(timeline)) return [];

  const events: NormalizedMatchEvent[] = [];
  for (let i = 0; i < timeline.length; i += 1) {
    const item = timeline[i] as RawTimelineItem | null;
    if (!item) continue;

    const type = classifyTimelineType(item.strTimeline ?? '', item.strTimelineDetail ?? '');
    if (!type) continue;

    const playerName = (item.strPlayer ?? '').trim();
    if (!playerName) continue;

    const assist = (item.strAssist ?? '').trim();
    const home = (item.strHome ?? '').trim().toLowerCase();
    events.push({
      type,
      minute: parseMinute(item.intTime),
      isHome: home === 'yes' ? true : home === 'no' ? false : null,
      playerName,
      playerOut: assist || null,
      externalId:
        item.idTimeline === null || item.idTimeline === undefined || item.idTimeline === ''
          ? `tl-${i}`
          : String(item.idTimeline),
    });
  }
  return events;
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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * TheSportsDB を取得元とする ResultProvider + MatchEventProvider 実装。
 *
 * 無料の eventsseason は先頭15件しか返さないため、`eventsday.php?d=<date>&l=4429`
 * を日付ウィンドウぶん呼び、その日の全W杯試合を取得して連結する。
 * ウィンドウ日数は env `INGEST_WINDOW_DAYS`（既定3）で調整可能（初回バックフィル時など）。
 *
 * イベントタイムラインは `lookuptimeline.php?id=<idEvent>` で試合ごとに取得する。
 * 無料キーでは約5件/試合に切り詰められるが、部分取込として正常系扱いにする
 * （replaceAutoMatchEvents が冪等な置き換えのため、後でキー強化すれば自然に充実する）。
 */
export function createTheSportsDbProvider(
  options: TheSportsDbOptions = {},
): ResultProvider & MatchEventProvider {
  const key = options.key ?? process.env.THESPORTSDB_KEY ?? '3';
  const windowDays = Number.parseInt(
    process.env.INGEST_WINDOW_DAYS ?? String(DEFAULT_WINDOW_DAYS),
    10,
  );
  // タイムライン取得のレート制限ペーシング用（2回目以降のリクエスト前に間隔を空ける）。
  let timelineFetched = false;

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

    async fetchMatchEvents(externalEventId: string) {
      if (timelineFetched) await sleep(TIMELINE_REQUEST_INTERVAL_MS);
      timelineFetched = true;

      const url = `https://www.thesportsdb.com/api/v1/json/${key}/lookuptimeline.php?id=${encodeURIComponent(externalEventId)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        throw new Error(
          `TheSportsDB timeline fetch failed (${externalEventId}): ${res.status} ${res.statusText}`,
        );
      }
      const raw = await res.json();
      return parseTheSportsDbTimeline(raw);
    },
  };
}
