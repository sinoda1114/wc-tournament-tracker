import type { MatchEventType } from '@/db/match-events';

import type {
  MatchEventContext,
  MatchEventProvider,
  NormalizedMatchEvent,
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

/** 記事内の1試合（football box ＋ 両チームのラインナップ）の抽出結果。 */
export type WikiMatch = {
  /** box の team1（=ホーム）の FIFAコード（大文字）。 */
  team1Code: string;
  /** box の team2（=アウェイ）の FIFAコード（大文字）。 */
  team2Code: string;
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
 */
function parseGoals(value: string, teamCode: string): WikiMatchEvent[] {
  const events: WikiMatchEvent[] = [];
  for (const rawLine of value.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('*')) continue;
    const linkInner = firstWikiLinkInner(line);
    if (!linkInner) continue;
    const playerName = cleanPlayerName(linkInner);
    if (!playerName) continue;

    // リンク以降（分・注記）だけを対象にする。
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
  const boxRe = /\{\{#invoke:football box\|main\b/g;

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

    const events: WikiMatchEvent[] = [];
    if (params.goals1) events.push(...parseGoals(params.goals1, team1Code));
    if (params.goals2) events.push(...parseGoals(params.goals2, team2Code));

    // ラインナップ領域 = この box の終端〜次の box の開始（無ければ末尾）。
    const regionEnd = b + 1 < boxStarts.length ? boxStarts[b + 1] : wikitext.length;
    const region = wikitext.slice(end, regionEnd);
    const tables = extractLineupTables(region);
    if (tables[0]) events.push(...parseLineupCardsAndSubs(tables[0], team1Code));
    if (tables[1]) events.push(...parseLineupCardsAndSubs(tables[1], team2Code));

    matches.push({ team1Code, team2Code, events: sortByMinute(events) });
  }
  return matches;
}

/**
 * ラインナップ領域から、先頭2つの選手テーブル（`{| style="font-size:90%"`）の本文を返す。
 * 各テーブルは行頭の `|}` で閉じる（入れ子の選手テーブルは無いため最初の `|}` で十分）。
 */
function extractLineupTables(region: string): string[] {
  const tables: string[] = [];
  const startRe = /\{\| style="font-size:90%/g;
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

async function defaultFetchWikitext(articleTitle: string): Promise<string | null> {
  const url =
    `${WIKI_API}?action=parse&page=${encodeURIComponent(articleTitle)}` +
    `&prop=wikitext&format=json&formatversion=2&redirects=1`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': WIKI_USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Wikipedia fetch failed (${articleTitle}): ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { parse?: { wikitext?: unknown } };
  const wikitext = data.parse?.wikitext;
  return typeof wikitext === 'string' ? wikitext : null;
}

/**
 * Wikipedia を取得元とする MatchEventProvider。
 * グループステージのみ対応。記事は run 中グループ単位でキャッシュし、6試合分を1フェッチで賄う。
 * 該当試合が見つからない/解析できない場合は空を返し、呼び出し側のフォールバックに委ねる。
 */
export function createWikipediaMatchEventProvider(
  options: WikipediaProviderOptions = {},
): MatchEventProvider {
  const fetchWikitext = options.fetchWikitext ?? defaultFetchWikitext;
  // グループ文字 → 解析済み試合一覧（run 内キャッシュ。同グループの複数試合で再フェッチしない）。
  const cache = new Map<string, WikiMatch[]>();

  async function getGroupMatches(letter: string): Promise<WikiMatch[]> {
    const cached = cache.get(letter);
    if (cached) return cached;
    const wikitext = await fetchWikitext(`2026 FIFA World Cup Group ${letter}`);
    const parsed = wikitext ? parseWikipediaGroupArticle(wikitext) : [];
    cache.set(letter, parsed);
    return parsed;
  }

  return {
    async fetchMatchEvents(context: MatchEventContext): Promise<NormalizedMatchEvent[]> {
      // グループステージのみ対応。決勝Tや文脈不足は空でフォールバックさせる。
      if (context.stage !== 'group_stage' || !context.groupLetter) return [];
      const home = context.homeCode.toUpperCase();
      const away = context.awayCode.toUpperCase();

      const groupMatches = await getGroupMatches(context.groupLetter.toUpperCase());
      const found = groupMatches.find(
        (m) =>
          (m.team1Code === home && m.team2Code === away) ||
          (m.team1Code === away && m.team2Code === home),
      );
      if (!found) return [];

      return found.events.map((e, index) => ({
        type: e.type,
        minute: e.minute,
        // isHome は「我々の home（=context.homeCode）の出来事か」。toAutoMatchEvents が
        // sync.homeTeamId/awayTeamId に解決するため、記事の team1/team2 の向きに依らず正しい。
        isHome: e.teamCode === home ? true : e.teamCode === away ? false : null,
        playerName: e.playerName,
        playerOut: e.playerOut,
        // 試合内で一意な冪等キー（replaceAutoMatchEvents の UNIQUE(match_id, external_id) 用）。
        externalId: `wp-${index}`,
      }));
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
  wiki: MatchEventProvider,
): ResultProvider & MatchEventProvider {
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
  };
}
