import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

import { seedTeams } from '../src/data/seed-teams';
import { getDb } from '../src/db/client';
import { fetchJsonWithRetry } from '../src/lib/fetch-retry';
import { MANUAL_COACH_LOCK } from '../src/lib/manual-coaches';

import {
  CODE_TO_ISO,
  fifaToIsoLocal,
  linkParts,
  parseCoach,
  type ParsedCoach,
} from './lib/squad-parse';

// 全選手＋監督は Wikipedia「2026 FIFA World Cup squads」から取得する。
// 1 リクエストでページ全体の wikitext を取り、48 カ国分を構造化テンプレートから
// パースする（TheSportsDB のような 1 国 10 名上限・レート制限がない）。
const WIKI_API =
  'https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&page=2026%20FIFA%20World%20Cup%20squads';

// 大会開始日（年齢計算の基準。Wikipedia の age テンプレートとも整合）。
const AS_OF = { y: 2026, m: 6, d: 11 };

// fifaCode -> Wikipedia のセクション見出し名（nameEn と異なる国のみ上書き）。
const WIKI_SECTION_OVERRIDE: Record<string, string> = {
  KOR: 'South Korea',
  CZE: 'Czech Republic',
  CIV: 'Ivory Coast',
  COD: 'DR Congo',
  TUR: 'Turkey',
  CPV: 'Cape Verde',
  IRN: 'Iran',
};

type ParsedPlayer = {
  number: string | null;
  pos: string;
  /** 英語名（英語版 Wikipedia の表示名）。 */
  name: string;
  /** 日本語名（取得できた場合のみ。既定 null）。 */
  nameJa: string | null;
  /** 英語版 Wikipedia の記事タイトル（リンク先）。日本語名解決に使う。 */
  link: string | null;
  dateBorn: string | null;
};

const pad = (n: string) => n.padStart(2, '0');

/** 年齢計算（AS_OF 基準）。 */
function ageFrom(dateBorn: string): number | null {
  const born = new Date(dateBorn);
  if (Number.isNaN(born.getTime())) return null;
  let age = AS_OF.y - born.getFullYear();
  const bm = born.getMonth() + 1;
  const bd = born.getDate();
  if (AS_OF.m < bm || (AS_OF.m === bm && AS_OF.d < bd)) age -= 1;
  return age;
}

/** 指定セクション（国）の wikitext を切り出す。 */
function sliceSection(wikitext: string, sectionName: string): string | null {
  const head = `===${sectionName}===`;
  const start = wikitext.indexOf(head);
  if (start < 0) return null;
  const after = start + head.length;
  const next = wikitext.indexOf('\n===', after);
  return wikitext.slice(after, next < 0 ? undefined : next);
}

/** 日本語タイトル末尾の曖昧さ回避 "（サッカー選手）"/"(footballer)" 等を除去する。 */
function stripDisambig(title: string): string {
  return title.replace(/\s*[（(][^）)]*[）)]\s*$/u, '').trim();
}

/**
 * 英語版 Wikipedia 記事タイトル群 -> 日本語版の実タイトル（曖昧さ回避を含む）の対応。
 * 英語版 API の langlinks(lllang=ja) を使い、最大 50 件ずつバッチで問い合わせる。
 * 実タイトルを返すのは、後段で正しい記事の冒頭文を引くため。
 */
async function fetchJaNames(titles: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniq = [...new Set(titles)];
  for (let i = 0; i < uniq.length; i += 50) {
    const batch = uniq.slice(i, i + 50);
    const url =
      'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=langlinks&lllang=ja&lllimit=500&titles=' +
      encodeURIComponent(batch.join('|'));
    const res = await fetch(url, {
      headers: { 'User-Agent': 'wc-tournament-tracker/1.0 (squad importer)' },
    });
    if (!res.ok) continue;
    const json = (await res.json()) as {
      query?: {
        normalized?: { from: string; to: string }[];
        pages?: Record<
          string,
          { title: string; langlinks?: { lang: string; '*': string }[] }
        >;
      };
    };
    // API は入力タイトルを正規化する。from->to を控えておき逆引きできるようにする。
    const norm = new Map<string, string>();
    for (const n of json.query?.normalized ?? []) norm.set(n.to, n.from);
    for (const page of Object.values(json.query?.pages ?? {})) {
      const ja = page.langlinks?.[0]?.['*'];
      if (!ja) continue;
      // 正規化後タイトルと、元の入力タイトル両方をキーにして実タイトルを保持。
      map.set(page.title, ja);
      const original = norm.get(page.title);
      if (original) map.set(original, ja);
    }
  }
  return map;
}

/**
 * 日本語版 Wikipedia 記事タイトル（スペース無し漢字名）-> 姓名の間に半角スペースを
 * 入れた表示名へ。記事冒頭の太字フルネーム（例「鈴木 彩艶（すずき あいと、…」）の
 * 「（」より前を採用する。
 *
 * 誤抽出を避けるため、抽出名から空白を除いた文字列が元タイトルと一致する場合のみ採用し、
 * 区切りは半角スペース1つに正規化する。一致しなければスペース無しのまま返す。
 */
async function fetchJaSpacedNames(
  jaTitles: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniq = [...new Set(jaTitles)];
  // extracts は exlimit が最大 20 件のため 20 ずつ分割する。
  for (let i = 0; i < uniq.length; i += 20) {
    const batch = uniq.slice(i, i + 20);
    const url =
      'https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&exlimit=max&titles=' +
      encodeURIComponent(batch.join('|'));
    const res = await fetch(url, {
      headers: { 'User-Agent': 'wc-tournament-tracker/1.0 (squad importer)' },
    });
    if (!res.ok) continue;
    const json = (await res.json()) as {
      query?: { pages?: Record<string, { title: string; extract?: string }> };
    };
    for (const page of Object.values(json.query?.pages ?? {})) {
      const ex = (page.extract ?? '').trim();
      if (!ex) continue;
      // 冒頭の「（」/「(」より前をフルネームとみなし、空白を半角1つに正規化。
      const head = ex.split(/[（(]/)[0].trim().replace(/\s+/g, ' ');
      // 空白除去後が（曖昧さ回避を除いた）タイトルと一致するときだけ採用（誤抽出ガード）。
      if (head.replace(/\s+/g, '') === stripDisambig(page.title)) {
        map.set(page.title, head);
      }
    }
  }
  return map;
}

/**
 * 日本代表の選手・監督名を日本語版 Wikipedia の漢字名（姓名間に半角スペース）へ
 * 置き換える（取れたものだけ）。英語版記事へのリンクが無い／日本語版が無い選手は
 * ローマ字のまま残す。
 */
async function localizeJapaneseNames(
  players: ParsedPlayer[],
  coach: ParsedCoach | null,
): Promise<number> {
  const links = [
    ...players.map((p) => p.link),
    coach?.link ?? null,
  ].filter((l): l is string => !!l);
  if (links.length === 0) return 0;

  // 1) 英語版記事 -> 日本語版タイトル（スペース無し）
  const jaTitleByLink = await fetchJaNames(links);
  // 2) 日本語版タイトル -> 姓名スペース入り表示名
  const spacedByTitle = await fetchJaSpacedNames([...jaTitleByLink.values()]);

  const resolve = (link: string | null): string | undefined => {
    if (!link) return undefined;
    const title = jaTitleByLink.get(link);
    if (!title) return undefined;
    // スペース入りが取れればそれを、無ければ曖昧さ回避を除いたタイトルを使う。
    return spacedByTitle.get(title) ?? stripDisambig(title);
  };

  let replaced = 0;
  for (const p of players) {
    const ja = resolve(p.link);
    if (ja) {
      p.nameJa = ja;
      replaced += 1;
    }
  }
  if (coach) {
    const ja = resolve(coach.link);
    if (ja) {
      coach.nameJa = ja;
      replaced += 1;
    }
  }
  return replaced;
}

function parsePlayers(section: string): ParsedPlayer[] {
  const players: ParsedPlayer[] = [];
  // age テンプレは表記揺れがある: 先頭大文字 "Birth date and age2"、
  // 生年月日の後ろに |df=y などの追加引数が付く場合がある（例: AUT の Ljubičić）。
  // これらを取りこぼさないよう、先頭大小文字を許容し末尾の追加引数を吸収する。
  const re =
    /no=([\d–-]*)\|pos=([A-Z]{2})\|name=(\[\[[^\]]+\]\]).*?age=\{\{\s*[Bb]irth date and age2\s*\|\s*\d+\|\d+\|\d+\|(\d+)\|(\d+)\|(\d+)(?:\s*\|[^}]*)?\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const [, no, pos, name, by, bm, bd] = m;
    const dateBorn = `${by}-${pad(bm)}-${pad(bd)}`;
    const { target, display } = linkParts(name);
    players.push({
      number: no && /\d/.test(no) ? no : null,
      pos,
      name: display,
      nameJa: null,
      link: target,
      dateBorn,
    });
  }
  return players;
}

async function main() {
  const db = getDb();

  // 一過性のネットワーク/HTTP 失敗に備えてリトライ＋タイムアウト付きで取得する。
  const json = await fetchJsonWithRetry<{
    parse?: { wikitext?: { '*'?: string } };
  }>(WIKI_API, {
    headers: { 'User-Agent': 'wc-tournament-tracker/1.0 (squad importer)' },
    retries: 3,
    timeoutMs: 20_000,
  });
  const rawWikitext = json.parse?.wikitext?.['*'];
  if (!rawWikitext) {
    throw new Error('Wikipedia wikitext was empty');
  }
  // HTML コメント（<!-- ... -->）を除去。一部の Coach 行や flagicon 内に
  // 出典コメントが挟まりパースを妨げるため、先に剥がす。
  const wikitext = rawWikitext.replace(/<!--[\s\S]*?-->/g, '');

  let resolvedCountries = 0;
  let totalPlayers = 0;
  let totalCoaches = 0;
  const noData: string[] = [];

  // 引数で国を絞れる（例: `tsx scripts/fetch-squads.ts AUT`）。指定なしは全48か国。
  const onlyCodes = process.argv
    .slice(2)
    .map((c) => c.toUpperCase())
    .filter((c) => /^[A-Z]{3}$/.test(c));
  const targetTeams = onlyCodes.length
    ? seedTeams.filter((t) => onlyCodes.includes(t.fifaCode))
    : seedTeams;

  for (const team of targetTeams) {
    const sectionName = WIKI_SECTION_OVERRIDE[team.fifaCode] ?? team.nameEn;
    const section = sliceSection(wikitext, sectionName);

    if (!section) {
      noData.push(`${team.fifaCode}(section:${sectionName})`);
      continue;
    }

    const coach = parseCoach(section);
    const players = parsePlayers(section);

    // 日本代表のみ、名前を日本語版 Wikipedia の漢字名へ置き換える。
    if (team.fifaCode === 'JPN') {
      const replaced = await localizeJapaneseNames(players, coach);
      console.log(`  JPN 漢字名に置換: ${replaced}名`);
    }

    await db.execute({ sql: 'DELETE FROM players WHERE team_id = ?', args: [team.id] });

    if (MANUAL_COACH_LOCK.has(team.fifaCode)) {
      // 監督交代の併記など自動パースが誤る国は手動ロック。coaches 行は上書きしない
      // （手動設定した正規値を保持）。選手名簿は上で更新済み。詳細: src/lib/manual-coaches.ts。
      console.log(`  🔒 ${team.fifaCode}: 監督は手動ロック中。coaches 行は保持します（上書きスキップ）。`);
    } else if (coach) {
      // fail-safe: 監督が読めたチームだけ既存行を消して入れ直す。
      // パース失敗時に既存の coaches 行を消さない（2026-06-11 の欠落事故の再発防止）。
      await db.execute({ sql: 'DELETE FROM coaches WHERE team_id = ?', args: [team.id] });
      // flagicon があれば外国人監督の母国、なければ自国（チーム自身の旗）。
      const nationalityIso = coach.flagCode
        ? CODE_TO_ISO[coach.flagCode] || null
        : fifaToIsoLocal(team.fifaCode);
      // 表示用 nationality: 外国人なら flagCode（3 文字）、自国なら null。
      const nationality = coach.flagCode ?? null;
      await db.execute({
        sql: `
          INSERT INTO coaches (team_id, name, name_en, name_ja, nationality, nationality_iso, date_born)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [team.id, coach.name, coach.name, coach.nameJa, nationality, nationalityIso, null],
      });
      totalCoaches += 1;
    } else {
      console.warn(
        `  ⚠ ${team.fifaCode}: 監督をパースできませんでした。既存の coaches 行は保持します（削除スキップ）`,
      );
    }

    if (players.length > 0) {
      await db.batch(
        players.map((p, index) => ({
          sql: `
            INSERT INTO players (id, team_id, name, name_en, name_ja, position, date_born, number, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              team_id = excluded.team_id,
              name = excluded.name,
              name_en = excluded.name_en,
              name_ja = excluded.name_ja,
              position = excluded.position,
              date_born = excluded.date_born,
              number = excluded.number,
              sort_order = excluded.sort_order
          `,
          args: [
            `${team.id}-${index}`,
            team.id,
            p.name,
            p.name,
            p.nameJa,
            p.pos,
            p.dateBorn,
            p.number,
            index,
          ],
        })),
      );
      totalPlayers += players.length;
    }

    if (players.length === 0 && !coach) {
      noData.push(team.fifaCode);
    } else {
      resolvedCountries += 1;
    }

    const sampleAge = players[0]?.dateBorn ? ageFrom(players[0].dateBorn) : null;
    console.log(
      `${team.fifaCode} (${team.nameJa}): 選手${players.length}名` +
        (coach
          ? ` / 監督 ${coach.name}${coach.flagCode ? ` [${coach.flagCode}]` : ' [自国]'}`
          : ' / 監督なし') +
        (players[0] ? ` / 例: ${players[0].name}(${sampleAge}歳)` : ''),
    );
  }

  console.log('\n=== サマリ ===');
  console.log(`データ取得国: ${resolvedCountries} / ${targetTeams.length}`);
  console.log(`総選手数: ${totalPlayers}  総監督数: ${totalCoaches}`);
  console.log(`データ無し: ${noData.length ? noData.join(', ') : 'なし'}`);
}

main().catch((error: unknown) => {
  console.error('fetch-squads failed');
  console.error(error);
  process.exitCode = 1;
});
