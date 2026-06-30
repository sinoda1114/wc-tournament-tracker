import type { MatchEventType } from '@/db/match-events';

import type {
  FallbackResultTarget,
  MatchEventContext,
  MatchEventProvider,
  NormalizedMatchEvent,
  NormalizedResult,
  ResultFallbackProvider,
  ResultProvider,
} from './types';

/**
 * Wikipedia（英語版）の試合記事から得点・カード・交代を取り出す取得元。
 *
 * 背景: TheSportsDB の無料キーはタイムラインを約5件/試合に切り詰めるため、得点者や
 * カードが欠落する。Wikipedia の `{{#invoke:football box}}` ＋ ラインナップ表は
 * 完全な得点・カード・交代を持つので、これを純関数でパースして補完する。
 *
 * 法務: Wikipedia 本文は CC BY-SA。事実データ自体は権利対象外だが、帰属表記を
 * フッターに掲示する運用とする（SiteFooter 参照）。
 *
 * 対応範囲: 現状はグループステージのみ（記事 `2026 FIFA World Cup Group <L>`）。
 * 決勝トーナメントは別記事構造のため未対応で、空を返してフォールバック（TheSportsDB）に委ねる。
 */

/** football box から得た、チーム単位（FIFAコード）でタグ付けしたイベント。 */
export type WikiMatchEvent = {
  type: MatchEventType;
  minute: number | null;
  /** 出来事の主体チームの FIFAコード（大文字）。 */
  teamCode: string;
  /** 主体選手（得点者 / カード対象 / 交代IN）。 */
  playerName: string;
  /** 補助選手（交代OUT）。得点・カードは null。 */
  playerOut: string | null;
};

/** football box の `score` パラメータから得た確定スコア（team1/team2 の向き）。 */
export type WikiMatchScore = { team1: number; team2: number };

/** 記事内の1試合（football box ＋ 両チームのラインナップ）の抽出結果。 */
export type WikiMatch = {
  /** box の team1（=ホーム）の FIFAコード（大文字）。 */
  team1Code: string;
  /** box の team2（=アウェイ）の FIFAコード（大文字）。 */
  team2Code: string;
  /** football box の `score`（"2–1" 等）。未実施/未記入なら null（=finished 判定にも使う）。 */
  score: WikiMatchScore | null;
  events: WikiMatchEvent[];
};

/** DB の CHECK（minute 0..130）に合わせる。"45+2"/"90+2" は先頭の数値を採用。NULL/範囲外は null。 */
function parseMinute(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0 || n > 130) return null;
  return n;
}

/**
 * `{{...}}` を波括弧の対応で1ブロック切り出す。`start` は開始の `{` の位置。
 * 内部に入れ子テンプレート（{{score link}} {{!}} {{multiref}} 等）があっても
 * 個々の `{`/`}` を数えて対応の取れた位置までを返す。閉じが見つからなければ末尾まで。
 */
function extractBraceBlock(text: string, start: number): { block: string; end: number } {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return { block: text.slice(start, i + 1), end: i + 1 };
    }
  }
  return { block: text.slice(start), end: text.length };
}

/**
 * テンプレート本体（`{{`/`}}` を外した中身）をトップレベルの `|` で分割する。
 * `{{...}}`（波括弧深さ）と `[[...]]`（角括弧深さ）の内側の `|` は区切らない。
 */
function splitTopLevelPipes(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let bracket = 0;
  let current = '';
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '[') bracket += 1;
    else if (ch === ']') bracket -= 1;
    if (ch === '|' && depth === 0 && bracket === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/** football box のパラメータ（key=value）を抽出する。値は前後空白のみ trim。 */
function parseTemplateParams(block: string): Record<string, string> {
  // 先頭 `{{` と末尾 `}}` を外す。
  const inner = block.replace(/^\{\{/, '').replace(/\}\}$/, '');
  const params: Record<string, string> = {};
  for (const seg of splitTopLevelPipes(inner)) {
    const eq = seg.indexOf('=');
    if (eq < 0) continue;
    const key = seg.slice(0, eq).trim();
    if (!key) continue;
    params[key] = seg.slice(eq + 1).trim();
  }
  return params;
}

/**
 * football box の `score`（"2–1" / "0-0" / "1 – 1" 等）から確定スコアを取り出す。
 * 区切りは en/em ダッシュとハイフンを許容。未実施（"v" / 空）や数値2つを取れない場合は null。
 * null は「未確定（=finished でない）」として扱う（0-0 と未実施を score の有無で区別する）。
 */
function parseScore(value: string | undefined): WikiMatchScore | null {
  if (!value) return null;
  // 実データは `{{score link|<anchor>|2–0}}` の形で、表示スコアは末尾セグメントに来る。
  // anchor 側の誤マッチを避けるため「最後の N–N」を採用する。未実施は `|Match 28}}` で N–N 無し→null。
  const matches = [...value.matchAll(/(\d+)\s*[–—-]\s*(\d+)/g)];
  const last = matches[matches.length - 1];
  if (!last) return null;
  return { team1: Number(last[1]), team2: Number(last[2]) };
}

/** `{{#invoke:flag|fb-rt|MEX}}` 等から3文字コードを取り出す（大文字）。無ければ null。 */
function extractFlagCode(value: string): string | null {
  const m = value.match(/\{\{#invoke:flag\|[^|}]*\|\s*([A-Za-z]{3})\b/);
  return m ? m[1].toUpperCase() : null;
}

/** 最初の `[[...]]` の中身（パイプ前後そのまま）を返す。無ければ null。 */
function firstWikiLinkInner(text: string): string | null {
  const m = text.match(/\[\[([^\]]+)\]\]/);
  return m ? m[1] : null;
}

/**
 * `[[Target|Display]]` / `[[Name (footballer)|Name]]` / `[[Name]]` から表示用のフルネームを得る。
 * ターゲット（パイプ前）を採用し、末尾の曖昧さ回避括弧 "(footballer)" 等を除去する。
 * 得点欄（`[[Julián Quiñones|Quiñones]]`→"Julián Quiñones"）とラインナップで名寄せが一致する。
 */
function cleanPlayerName(linkInner: string): string {
  const target = linkInner.split('|')[0];
  return target.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/**
 * football box の `goals1`/`goals2` 値から得点イベントを取り出す。
 * 各行は `*[[Target|Display]] 9` 形式で、1行に複数分（`23, 45+2 (pen.)`）や
 * `(pen.)`/`(o.g.)` 注記を持つことがある。注記で goal/penalty_goal/own_goal を判定する。
 *
 * 先頭の箇条書き記号 `*` は必須としない（T-76）。得点が1件のとき編集者が `*` を省く
 * ことがあり（例: 韓国 2-1 チェコ の `[[…Krejčí]] 59'`）、`*` 必須の旧実装はその行を
 * 丸ごと捨てて得点者を取りこぼした。over-capture を避けるため、対象とするのは
 * 「`[[…]]` リンクを含み、かつリンク以降に分表記（`59` / `45+2` 等）を持つ行」に限る。
 * 分末のアポストロフィ（`59'`）はトークン正規表現が数字部のみ拾うため問題ない。
 */
function parseGoals(value: string, teamCode: string): WikiMatchEvent[] {
  const events: WikiMatchEvent[] = [];
  for (const rawLine of value.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const linkInner = firstWikiLinkInner(line);
    if (!linkInner) continue;
    const playerName = cleanPlayerName(linkInner);
    if (!playerName) continue;

    // リンク以降（分・注記）だけを対象にする。リンクだけで分の無い行（注釈等）は
    // 1件もマッチせず、得点として拾わない（保守的: 誤検出を避ける）。
    const after = line.slice(line.indexOf(']]') + 2);
    const tokenRe = /(\d+(?:\+\d+)?)\s*(?:\(([^)]*)\))?/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRe.exec(after)) !== null) {
      const annotation = (match[2] ?? '').toLowerCase();
      let type: MatchEventType = 'goal';
      if (annotation.includes('o.g') || annotation.includes('own')) type = 'own_goal';
      else if (annotation.includes('pen')) type = 'penalty_goal';
      events.push({
        type,
        minute: parseMinute(match[1]),
        teamCode,
        playerName,
        playerOut: null,
      });
    }
  }
  return events;
}

type SubMarker = { player: string; minute: number | null };

/**
 * ラインナップ表（1チーム分）の各選手行からカード・交代マーカーを取り出す。
 * 行は `|GK ||'''1''' ||[[Player]] || {{yel|23}} || {{suboff|66}}` 形式。
 * - `{{yel|m}}` → 黄カード（1行に2枚=2イベントもあり得る）
 * - `{{sent off|a|b}}` / `{{red|m}}` → 赤カード（sent off は退場分=第2引数）
 * - `{{subon|m}}` / `{{suboff|m}}` → 交代（IN/OUT を分単位で後段ペアリング）
 * 交代は IN↔OUT を同分でペアにして substitution を1件にまとめる。
 */
function parseLineupCardsAndSubs(tableText: string, teamCode: string): WikiMatchEvent[] {
  const events: WikiMatchEvent[] = [];
  const subOn: SubMarker[] = [];
  const subOff: SubMarker[] = [];

  for (const rawLine of tableText.split('\n')) {
    const line = rawLine.trim();
    // 選手行のみ対象。見出し/監督/小計などの colspan 行や、選手リンクの無い行は除外。
    if (line.includes('colspan')) continue;
    const linkInner = firstWikiLinkInner(line);
    if (!linkInner) continue;
    if (!/\{\{(yel|sent off|red|subon|suboff)\b/.test(line)) continue;
    const player = cleanPlayerName(linkInner);
    if (!player) continue;

    for (const yel of line.matchAll(/\{\{yel\|([^}]*)\}\}/g)) {
      events.push({
        type: 'yellow_card',
        minute: parseMinute(yel[1].trim()),
        teamCode,
        playerName: player,
        playerOut: null,
      });
    }
    // sent off は `{{sent off|<1stYellow|0>|<退場分>}}`。退場分は最後の引数を採用。
    for (const off of line.matchAll(/\{\{sent off\|([^}]*)\}\}/g)) {
      const args = off[1].split('|').map((a) => a.trim());
      const redMinute = args[args.length - 1] ?? '';
      events.push({
        type: 'red_card',
        minute: parseMinute(redMinute),
        teamCode,
        playerName: player,
        playerOut: null,
      });
    }
    // 直接レッド（単独テンプレート）にも対応。
    for (const red of line.matchAll(/\{\{red\|([^}]*)\}\}/g)) {
      events.push({
        type: 'red_card',
        minute: parseMinute(red[1].trim()),
        teamCode,
        playerName: player,
        playerOut: null,
      });
    }
    for (const on of line.matchAll(/\{\{subon\|([^}]*)\}\}/g)) {
      subOn.push({ player, minute: parseMinute(on[1].trim()) });
    }
    for (const off of line.matchAll(/\{\{suboff\|([^}]*)\}\}/g)) {
      subOff.push({ player, minute: parseMinute(off[1].trim()) });
    }
  }

  // 交代 IN↔OUT を同分でペアリング。OUT が見つからない IN は playerOut=null で残す。
  const usedOff = new Set<number>();
  for (const on of subOn) {
    let partnerIndex = -1;
    for (let i = 0; i < subOff.length; i += 1) {
      if (usedOff.has(i)) continue;
      if (subOff[i].minute === on.minute) {
        partnerIndex = i;
        break;
      }
    }
    const out = partnerIndex >= 0 ? subOff[partnerIndex] : null;
    if (partnerIndex >= 0) usedOff.add(partnerIndex);
    events.push({
      type: 'substitution',
      minute: on.minute,
      teamCode,
      playerName: on.player,
      playerOut: out ? out.player : null,
    });
  }
  return events;
}

/** 分の昇順（不明=末尾）に安定ソートする。 */
function sortByMinute(events: WikiMatchEvent[]): WikiMatchEvent[] {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const am = a.e.minute ?? Number.POSITIVE_INFINITY;
      const bm = b.e.minute ?? Number.POSITIVE_INFINITY;
      if (am !== bm) return am - bm;
      return a.i - b.i;
    })
    .map((x) => x.e);
}

/**
 * グループ記事の wikitext から、含まれる全試合の得点・カード・交代を抽出する純関数。
 * ネットワークI/Oを持たないので fixture で単体テストできる。
 *
 * 各 `{{#invoke:football box|main}}` を1試合とし、直後（次の box まで）に現れる
 * 2つの `{| style="font-size:90%"` ラインナップ表を team1（ホーム）/team2（アウェイ）として扱う。
 */
export function parseWikipediaGroupArticle(wikitext: string): WikiMatch[] {
  const matches: WikiMatch[] = [];
  const boxRe = /\{\{#invoke:football box\|main\b/gi;

  // すべての box の開始位置を集める（ラインナップ領域の終端＝次の box 開始に使う）。
  const boxStarts: number[] = [];
  let bm: RegExpExecArray | null;
  while ((bm = boxRe.exec(wikitext)) !== null) boxStarts.push(bm.index);

  for (let b = 0; b < boxStarts.length; b += 1) {
    const start = boxStarts[b];
    const { block, end } = extractBraceBlock(wikitext, start);
    const params = parseTemplateParams(block);

    const team1Code = extractFlagCode(params.team1 ?? '');
    const team2Code = extractFlagCode(params.team2 ?? '');
    if (!team1Code || !team2Code) continue;

    const score = parseScore(params.score);

    const events: WikiMatchEvent[] = [];
    if (params.goals1) events.push(...parseGoals(params.goals1, team1Code));
    if (params.goals2) events.push(...parseGoals(params.goals2, team2Code));

    // ラインナップ領域 = この box の終端〜次の box の開始（無ければ末尾）。
    const regionEnd = b + 1 < boxStarts.length ? boxStarts[b + 1] : wikitext.length;
    const region = wikitext.slice(end, regionEnd);
    const tables = extractLineupTables(region);
    if (tables[0]) events.push(...parseLineupCardsAndSubs(tables[0], team1Code));
    if (tables[1]) events.push(...parseLineupCardsAndSubs(tables[1], team2Code));

    matches.push({ team1Code, team2Code, score, events: sortByMinute(events) });
  }
  return matches;
}

/**
 * WikiMatch を、我々の home/away の向きに合わせた NormalizedResult に変換する純関数（T-82③）。
 * - `score` が無い（未実施/未記入）なら null（=フォールバック対象にしない＝誤確定を防ぐ）。
 * - 記事の team1/team2 と target の home/away の対応が取れない場合も null。
 * - finished は score がある＝試合終了とみなす（Wikipedia の football box は終了後に score が入る）。
 */
export function wikiMatchToResult(
  match: WikiMatch,
  target: { homeCode: string; awayCode: string; matchDate: string },
): NormalizedResult | null {
  if (!match.score) return null;
  const home = target.homeCode.toUpperCase();
  const away = target.awayCode.toUpperCase();

  let homeScore: number;
  let awayScore: number;
  if (match.team1Code === home && match.team2Code === away) {
    homeScore = match.score.team1;
    awayScore = match.score.team2;
  } else if (match.team1Code === away && match.team2Code === home) {
    homeScore = match.score.team2;
    awayScore = match.score.team1;
  } else {
    return null;
  }

  return {
    dateEvent: target.matchDate,
    homeName: home,
    awayName: away,
    homeScore,
    awayScore,
    finished: true,
    externalEventId: null,
  };
}

/**
 * ラインナップ領域から、先頭2つの選手テーブル（`{| style="font-size:90%"`）の本文を返す。
 * 各テーブルは行頭の `|}` で閉じる（入れ子の選手テーブルは無いため最初の `|}` で十分）。
 */
function extractLineupTables(region: string): string[] {
  const tables: string[] = [];
  // 属性順に依存せず「font-size:90% を含むテーブル開始」にマッチさせる（class= が先頭に
  // 来る等の編集ゆれに強くする）。先頭2つ＝両チームのXI。3つ目以降（試合ルール表など）は捨てる。
  const startRe = /\{\|[^|]*font-size:90%/g;
  let m: RegExpExecArray | null;
  while ((m = startRe.exec(region)) !== null && tables.length < 2) {
    const from = m.index;
    const closeRel = region.slice(from).search(/\n\|\}/);
    const to = closeRel >= 0 ? from + closeRel : region.length;
    tables.push(region.slice(from, to));
    startRe.lastIndex = to;
  }
  return tables;
}

type WikipediaProviderOptions = {
  /** 記事 wikitext の取得関数（テスト時に差し替え可能）。既定は MediaWiki API。 */
  fetchWikitext?: (articleTitle: string) => Promise<string | null>;
};

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
// Wikimedia の API ポリシーは「連絡先を含む説明的な User-Agent」を要求する
// （汎用/欠落 UA はブロックされ得る）。サービス名と連絡手段を明示する。
const WIKI_USER_AGENT = 'MatchFav/1.0 (https://matchfav.com; info@matchfav.com)';
// 1記事あたりの取得タイムアウト（ms）。Wikipedia 応答遅延で ingest 全体（maxDuration=60s）が
// 無言で枯れるのを防ぐ。超過時は throw → withWikipediaEvents が TheSportsDB にフォールバック。
const WIKI_FETCH_TIMEOUT_MS = 10_000;

async function defaultFetchWikitext(articleTitle: string): Promise<string | null> {
  const url =
    `${WIKI_API}?action=parse&page=${encodeURIComponent(articleTitle)}` +
    `&prop=wikitext&format=json&formatversion=2&redirects=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WIKI_FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': WIKI_USER_AGENT },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`Wikipedia fetch failed (${articleTitle}): ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { parse?: { wikitext?: unknown } };
  const wikitext = data.parse?.wikitext;
  return typeof wikitext === 'string' ? wikitext : null;
}

/**
 * Wikipedia を取得元とする MatchEventProvider。
 * グループステージ・決勝トーナメント両対応。記事は run 中ラウンド単位でキャッシュする。
 * 該当試合が見つからない/解析できない場合は空を返し、呼び出し側のフォールバックに委ねる。
 */
/** グループステージの全 12 組（fetchResults の走査対象）。 */
const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

/**
 * 決勝トーナメントの各ラウンドに対応する Wikipedia 記事タイトル。
 * 記事が未作成/未整備の場合は fetchWikitext が null を返し、空配列としてキャッシュする。
 */
const KO_STAGE_ARTICLES: Readonly<Record<string, string>> = {
  round_of_32: '2026 FIFA World Cup round of 32',
  round_of_16: '2026 FIFA World Cup round of 16',
  quarter_final: '2026 FIFA World Cup quarter-finals',
  semi_final: '2026 FIFA World Cup semi-finals',
  final: '2026 FIFA World Cup final',
  third_place: '2026 FIFA World Cup third-place match',
};

export function createWikipediaMatchEventProvider(
  options: WikipediaProviderOptions = {},
): MatchEventProvider & ResultFallbackProvider & ResultProvider {
  const fetchWikitext = options.fetchWikitext ?? defaultFetchWikitext;
  // グループ文字 → 解析済み試合一覧（run 内キャッシュ。同グループの複数試合で再フェッチしない）。
  const cache = new Map<string, WikiMatch[]>();
  // 決勝Tラウンド → 解析済み試合一覧（同ラウンドの複数試合で再フェッチしない）。
  const koCache = new Map<string, WikiMatch[]>();

  async function getGroupMatches(letter: string): Promise<WikiMatch[]> {
    const cached = cache.get(letter);
    if (cached) return cached;
    const wikitext = await fetchWikitext(`2026 FIFA World Cup Group ${letter}`);
    const parsed = wikitext ? parseWikipediaGroupArticle(wikitext) : [];
    cache.set(letter, parsed);
    return parsed;
  }

  async function getKoMatches(stage: string): Promise<WikiMatch[]> {
    const cached = koCache.get(stage);
    if (cached) return cached;
    const articleTitle = KO_STAGE_ARTICLES[stage];
    if (!articleTitle) return [];
    const wikitext = await fetchWikitext(articleTitle);
    const parsed = wikitext ? parseWikipediaGroupArticle(wikitext) : [];
    koCache.set(stage, parsed);
    return parsed;
  }

  /** チームペアで WikiMatch を探す共通ヘルパー。 */
  function findByTeams(matches: WikiMatch[], home: string, away: string): WikiMatch | undefined {
    return matches.find(
      (m) =>
        (m.team1Code === home && m.team2Code === away) ||
        (m.team1Code === away && m.team2Code === home),
    );
  }

  /** WikiMatch のイベントを NormalizedMatchEvent に変換する共通ヘルパー。 */
  function eventsFromWiki(found: WikiMatch, home: string, away: string): NormalizedMatchEvent[] {
    return found.events.map((e, index) => ({
      type: e.type,
      minute: e.minute,
      // isHome は「我々の home（=context.homeCode）の出来事か」。
      isHome: e.teamCode === home ? true : e.teamCode === away ? false : null,
      playerName: e.playerName,
      playerOut: e.playerOut,
      externalId: `wp-${index}`,
    }));
  }

  return {
    async fetchResults(): Promise<NormalizedResult[]> {
      // GL 全 12 組 + 決勝T全ラウンドから score の入った試合を返す（Wikipedia 主ソース用途）。
      // 日付は記事から取らないため dateEvent は空（reconcile はペアのみで一意化）。
      const out: NormalizedResult[] = [];
      for (const letter of GROUP_LETTERS) {
        try {
          const groupMatches = await getGroupMatches(letter);
          for (const match of groupMatches) {
            if (!match.score) continue;
            out.push({
              dateEvent: '',
              homeName: match.team1Code,
              awayName: match.team2Code,
              homeScore: match.score.team1,
              awayScore: match.score.team2,
              finished: true,
              externalEventId: null,
              source: 'wikipedia',
            });
          }
        } catch (error) {
          console.error('[ingest] Wikipedia fetchResults failed for group', letter, error);
        }
      }
      for (const stage of Object.keys(KO_STAGE_ARTICLES)) {
        try {
          const koMatches = await getKoMatches(stage);
          for (const match of koMatches) {
            if (!match.score) continue;
            out.push({
              dateEvent: '',
              homeName: match.team1Code,
              awayName: match.team2Code,
              homeScore: match.score.team1,
              awayScore: match.score.team2,
              finished: true,
              externalEventId: null,
              source: 'wikipedia',
            });
          }
        } catch (error) {
          console.error('[ingest] Wikipedia fetchResults failed for stage', stage, error);
        }
      }
      return out;
    },

    async fetchMatchEvents(context: MatchEventContext): Promise<NormalizedMatchEvent[]> {
      const home = context.homeCode.toUpperCase();
      const away = context.awayCode.toUpperCase();

      if (context.stage === 'group_stage' && context.groupLetter) {
        const groupMatches = await getGroupMatches(context.groupLetter.toUpperCase());
        const found = findByTeams(groupMatches, home, away);
        if (!found) return [];
        return eventsFromWiki(found, home, away);
      }

      if (context.stage in KO_STAGE_ARTICLES) {
        const koMatches = await getKoMatches(context.stage);
        const found = findByTeams(koMatches, home, away);
        if (!found) return [];
        return eventsFromWiki(found, home, away);
      }

      return [];
    },

    async fetchFallbackResults(targets: FallbackResultTarget[]): Promise<NormalizedResult[]> {
      const results: NormalizedResult[] = [];
      for (const t of targets) {
        try {
          const home = t.homeCode.toUpperCase();
          const away = t.awayCode.toUpperCase();

          if (t.stage === 'group_stage' && t.groupLetter) {
            const groupMatches = await getGroupMatches(t.groupLetter.toUpperCase());
            const found = findByTeams(groupMatches, home, away);
            if (!found) continue;
            const result = wikiMatchToResult(found, t);
            if (result) results.push(result);
          } else if (t.stage in KO_STAGE_ARTICLES) {
            const koMatches = await getKoMatches(t.stage);
            const found = findByTeams(koMatches, home, away);
            if (!found) continue;
            const result = wikiMatchToResult(found, t);
            if (result) results.push(result);
          }
        } catch (error) {
          console.error('[ingest] Wikipedia fallback result failed', t.stage, error);
        }
      }
      return results;
    },
  };
}

/**
 * 「Wikipedia を優先し、空/失敗なら base（TheSportsDB）にフォールバック」する合成 provider。
 * fetchResults は base に委譲（結果・日程・スコアは引き続き TheSportsDB が正）。
 * Wikipedia が1件でもイベントを返せばそれを採用し、無ければ base のタイムラインを使う。
 * これにより取得元を1試合につき1つに保ち、ソース横断の重複排除を不要にする。
 */
export function withWikipediaEvents(
  base: ResultProvider & MatchEventProvider,
  wiki: MatchEventProvider & ResultFallbackProvider,
): ResultProvider & MatchEventProvider & ResultFallbackProvider {
  return {
    fetchResults: () => base.fetchResults(),
    async fetchMatchEvents(context: MatchEventContext): Promise<NormalizedMatchEvent[]> {
      try {
        const events = await wiki.fetchMatchEvents(context);
        if (events.length > 0) return events;
      } catch (error) {
        // Wikipedia 側の失敗はフォールバックに切り替える（取込全体は止めない）。
        console.error('[ingest] Wikipedia events failed, falling back to base', error);
      }
      return base.fetchMatchEvents(context);
    },
    // 結果フォールバック（T-82③）は Wikipedia に委譲する。base（TheSportsDB）が確定できなかった
    // 試合だけを run 層が targets として渡すため、主ソース優先は保たれる。
    fetchFallbackResults: (targets: FallbackResultTarget[]): Promise<NormalizedResult[]> =>
      wiki.fetchFallbackResults(targets),
  };
}

/**
 * 「Wikipedia をグループ結果の主ソースにする」合成 provider（INGEST_RESULTS_SOURCE=wikipedia 用）。
 *
 * - fetchResults: Wikipedia（全12組・完全）と TheSportsDB（決勝T含む全体）を union して返す。
 *   各結果に source を付け、reconcile が試合単位で **グループ戦は Wikipedia を優先**する
 *   （TheSportsDB が取りこぼした/古いグループ結果も Wikipedia が埋める）。
 * - Wikipedia の fetchResults が落ちたら TheSportsDB のみで継続（取込全体は止めない）。
 * - イベントは従来どおり Wikipedia 優先（得点者/カードの完全性）。
 * - fetchFallbackResults は安全網として Wikipedia に委譲（変更なし）。
 */
export function withWikipediaPrimaryResults(
  base: ResultProvider & MatchEventProvider,
  wiki: MatchEventProvider & ResultFallbackProvider & ResultProvider,
): ResultProvider & MatchEventProvider & ResultFallbackProvider {
  return {
    async fetchResults(): Promise<NormalizedResult[]> {
      let wikiResults: NormalizedResult[] = [];
      try {
        wikiResults = (await wiki.fetchResults()).map((r) => ({ ...r, source: 'wikipedia' as const }));
      } catch (error) {
        console.error('[ingest] Wikipedia primary results failed, using base only', error);
      }
      const baseResults = (await base.fetchResults()).map((r) => ({ ...r, source: 'thesportsdb' as const }));
      // 両方渡す。試合単位の採否（グループは Wikipedia 勝ち）は reconcile.planMatchUpdates が決める。
      return [...baseResults, ...wikiResults];
    },
    async fetchMatchEvents(context: MatchEventContext): Promise<NormalizedMatchEvent[]> {
      try {
        const events = await wiki.fetchMatchEvents(context);
        if (events.length > 0) return events;
      } catch (error) {
        console.error('[ingest] Wikipedia events failed, falling back to base', error);
      }
      return base.fetchMatchEvents(context);
    },
    fetchFallbackResults: (targets: FallbackResultTarget[]): Promise<NormalizedResult[]> =>
      wiki.fetchFallbackResults(targets),
  };
}
