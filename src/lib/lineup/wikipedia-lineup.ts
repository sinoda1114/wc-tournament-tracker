/**
 * T-87 フェーズ1: Wikipedia の試合記事（レンダリング後HTML）から先発XIを解析する。
 *
 * グループ記事 "2026 FIFA World Cup Group {letter}" の prop=text（HTML）には、各試合の
 * スタメンが「ポジション略号＋背番号＋選手名」のテーブルとして含まれる（生 wikitext には
 * 出ず、テンプレ展開後のHTMLにのみ現れる）。中央のピッチ図は画像なので使わず、左右の
 * 選手リスト（テキスト）だけを読む。依存追加を避けるため軽量な文字列/正規表現で解析する。
 *
 * 取得できない試合（未記入・解析失敗）は null を返し、呼び出し側でピッチ非表示にする
 * （中途半端を見せない＝データ完全性ポリシー）。
 */

const WIKI_API = 'https://en.wikipedia.org/w/api.php';

/**
 * FIFAコード → Wikipedia 英語版の記事/見出しで使われるチーム名。
 * FIFA表記と Wikipedia 表記が食い違う国だけ列挙（未掲載は nameEn をそのまま使う）。
 * 実テストで判明した差分を登録（カバレッジは coverage テストで随時拡張）。
 */
const WIKI_TEAM_NAME_ALIAS: Record<string, string> = {
  KOR: 'South Korea', // FIFA: Korea Republic
  CZE: 'Czech Republic', // FIFA/DB: Czechia
  TUR: 'Turkey', // FIFA/DB: Türkiye
  CIV: 'Ivory Coast', // FIFA/DB: Côte d'Ivoire
};

/** Wikipedia 見出しで使うチーム名に正規化する。 */
function wikiTeamName(fifaCode: string | null | undefined, nameEn: string): string {
  return (fifaCode && WIKI_TEAM_NAME_ALIAS[fifaCode.toUpperCase()]) || nameEn;
}
const WIKI_USER_AGENT = 'MatchFav/1.0 (https://matchfav.com; info@matchfav.com)';
/** 試合スタメンは変動が少ないため長めにキャッシュ（秒）。 */
const REVALIDATE_SECONDS = 3600;

export type LineupPlayer = {
  /** Wikipedia のポジション略号（GK/RB/CB/LB/DM/CM/RM/LM/AM/RW/LW/RF/CF/LF など）。 */
  posCode: string;
  number: number | null;
  name: string;
};

/** ピッチ配置済みの選手（x,y はチーム自陣ハーフ内の正規化座標 0..1）。 */
export type PitchPlayer = LineupPlayer & {
  /** 横位置 0=左端 1=右端。 */
  x: number;
  /** 縦位置 0=自ゴール側 1=ハーフライン側。 */
  y: number;
};

export type MatchLineup = {
  home: PitchPlayer[];
  away: PitchPlayer[];
};

type FetchHtml = (articleTitle: string) => Promise<string | null>;

async function defaultFetchHtml(articleTitle: string): Promise<string | null> {
  const url =
    `${WIKI_API}?action=parse&page=${encodeURIComponent(articleTitle)}` +
    `&prop=text&format=json&formatversion=2&redirects=1`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': WIKI_USER_AGENT },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { parse?: { text?: unknown } };
  const text = data.parse?.text;
  return typeof text === 'string' ? text : null;
}

/**
 * ラテン文字名を姓中心に短縮（"Virgil van Dijk (c)" → "van Dijk (c)"）。
 * オランダ系の "van der" 等の前置詞は姓に含める。日本語名など空白の無い名前はそのまま。
 */
export function shortLatinName(name: string): string {
  const captain = / \(c\)$/.test(name) ? ' (c)' : '';
  const base = name.replace(/ \(c\)$/, '');
  const parts = base.split(' ');
  if (parts.length <= 1) return name;
  const particles = new Set(['van', 'de', 'der', 'den', 'di', 'da', 'dos', 'del', 'la', 'le']);
  let i = parts.length - 1;
  while (i > 0 && particles.has(parts[i - 1].toLowerCase())) i -= 1;
  return parts.slice(i).join(' ') + captain;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .trim();
}

/** 見出し id（"Home_vs_Away"）から試合セクションのHTMLを切り出す。見つからなければ null。 */
function sliceSection(html: string, homeEn: string, awayEn: string): { section: string; reversed: boolean } | null {
  const toId = (s: string) => s.replace(/ /g, '_');
  const forward = `id="${toId(homeEn)}_vs_${toId(awayEn)}"`;
  const reverse = `id="${toId(awayEn)}_vs_${toId(homeEn)}"`;

  let reversed = false;
  let start = html.indexOf(forward);
  if (start < 0) {
    start = html.indexOf(reverse);
    reversed = true;
  }
  if (start < 0) return null;

  // 次の試合見出し（mw-heading3）までをセクションとする。
  const next = html.indexOf('mw-heading3', start + forward.length);
  const section = html.slice(start, next > 0 ? next : start + 20000);
  return { section, reversed };
}

/** font-size:90% のラインアップテーブルを最大2つ取り出す（home, away の順）。 */
function extractLineupTables(section: string): string[] {
  const tables: string[] = [];
  const re = /<table[^>]*font-size:90%[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) && tables.length < 2) {
    const open = m.index;
    const close = section.indexOf('</table>', open);
    if (close < 0) break;
    tables.push(section.slice(open, close));
    re.lastIndex = close;
  }
  return tables;
}

/** 1テーブル分の先発XI（"Substitutions:" 手前まで・最大11人）を抽出。 */
function parseLineupTable(tableHtml: string): LineupPlayer[] {
  const players: LineupPlayer[] = [];
  const rows = tableHtml.split(/<tr[\s>]/i);
  for (const row of rows) {
    if (/Substitutions/i.test(row)) break; // 交代選手の手前で終了＝先発のみ
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripTags(c[1]));
    if (cells.length < 3) continue;
    const posCode = cells[0];
    if (!/^[A-Z]{1,3}$/.test(posCode)) continue; // ポジション略号の行だけ
    const num = Number.parseInt(cells[1], 10);
    const name = cells[2];
    if (!name) continue;
    players.push({ posCode, number: Number.isFinite(num) ? num : null, name });
  }
  return players.slice(0, 11);
}

/** ポジション略号 → 段ランク（0=GK 1=DF 2=DM 3=MF 4=AM 5=FW）。 */
function rowRank(code: string): number {
  const c = code.toUpperCase();
  if (c === 'GK') return 0;
  if (c === 'DM') return 2;
  if (c === 'AM' || c === 'RW' || c === 'LW') return 4;
  if (c === 'CF' || c === 'RF' || c === 'LF' || c === 'SS' || c === 'ST' || c === 'FW') return 5;
  if (c === 'CM' || c === 'RM' || c === 'LM') return 3;
  // 残り（RB/LB/CB/WB/RWB/LWB/SW 等）は守備ライン。
  return 1;
}

/** 略号の左右ヒント（-1=左 0=中央 +1=右）。 */
function sideHint(code: string): number {
  const c = code.toUpperCase();
  if (c.startsWith('L')) return -1;
  if (c.startsWith('R')) return 1;
  return 0;
}

/**
 * 先発XIをフォーメーション座標へ。GK を自陣端(y≈0)、前線をハーフライン側(y≈1)に。
 * 各段は登場ライン順に縦、段内は左右ヒント＋登場順で横に等間隔配置。
 */
function layoutTeam(players: LineupPlayer[]): PitchPlayer[] {
  const byRank = new Map<number, LineupPlayer[]>();
  players.forEach((p) => {
    const r = rowRank(p.posCode);
    const arr = byRank.get(r) ?? [];
    arr.push(p);
    byRank.set(r, arr);
  });

  const ranks = [...byRank.keys()].sort((a, b) => a - b);
  const out: PitchPlayer[] = [];
  ranks.forEach((rank, rankIdx) => {
    const line = byRank.get(rank)!;
    // 段内の左右ソート（左→中央→右、同ヒントは登場順）。
    const sorted = line
      .map((p, i) => ({ p, i, s: sideHint(p.posCode) }))
      .sort((a, b) => a.s - b.s || a.i - b.i)
      .map((e) => e.p);
    const n = sorted.length;
    // y: 段を 0.06..0.94 に等間隔（1段だけなら中央寄り）。
    const y = ranks.length === 1 ? 0.5 : 0.06 + (0.88 * rankIdx) / (ranks.length - 1);
    sorted.forEach((p, i) => {
      const x = n === 1 ? 0.5 : 0.12 + (0.76 * i) / (n - 1);
      out.push({ ...p, x, y });
    });
  });
  return out;
}

export type WikipediaLineupOptions = {
  fetchHtml?: FetchHtml;
};

/**
 * 試合のスタメンを取得して home/away それぞれ配置済みで返す。
 * グループステージのみ対応（記事構造が異なる決勝Tは対象外＝null）。
 */
export type LineupTeamRef = { nameEn: string; fifaCode: string | null };

export async function fetchMatchLineup(
  params: { home: LineupTeamRef; away: LineupTeamRef; groupLetter: string },
  options: WikipediaLineupOptions = {},
): Promise<MatchLineup | null> {
  const { home, away, groupLetter } = params;
  if (!home?.nameEn || !away?.nameEn || !groupLetter) return null;

  const homeName = wikiTeamName(home.fifaCode, home.nameEn);
  const awayName = wikiTeamName(away.fifaCode, away.nameEn);

  const fetchHtml = options.fetchHtml ?? defaultFetchHtml;
  const html = await fetchHtml(`2026 FIFA World Cup Group ${groupLetter}`);
  if (!html) return null;

  const sliced = sliceSection(html, homeName, awayName);
  if (!sliced) return null;

  const tables = extractLineupTables(sliced.section);
  if (tables.length < 2) return null;

  const first = parseLineupTable(tables[0]);
  const second = parseLineupTable(tables[1]);
  // 記事は team1(=左/home) → team2(=右/away) の順。見出しが逆順一致なら入れ替え。
  const homeXi = sliced.reversed ? second : first;
  const awayXi = sliced.reversed ? first : second;
  if (homeXi.length === 0 || awayXi.length === 0) return null;

  return { home: layoutTeam(homeXi), away: layoutTeam(awayXi) };
}
