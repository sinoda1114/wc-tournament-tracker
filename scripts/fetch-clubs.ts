import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

import { getDb } from '../src/db/client';
import { fetchJsonWithRetry } from '../src/lib/fetch-retry';

// NOTE: fetch-squads.ts は import するだけで main() が走る（全48か国の再取得という
// 重い副作用）ため、共有せず必要なヘルパーをここに複製する。
// clubnat（FIFA/IOC 3文字）→ 旗用 ISO2。fetch-squads の CODE_TO_ISO と同内容。
const CODE_TO_ISO: Record<string, string> = {
  ITA: 'it', GER: 'de', NED: 'nl', ESP: 'es', FRA: 'fr', POR: 'pt',
  ARG: 'ar', BRA: 'br', ENG: 'gb-eng', SCO: 'gb-sct', WAL: 'gb-wls',
  NIR: 'gb-nir', IRL: 'ie', BEL: 'be', CRO: 'hr', SRB: 'rs', GRE: 'gr',
  SUI: 'ch', AUT: 'at', DEN: 'dk', SWE: 'se', NOR: 'no', POL: 'pl',
  RUS: 'ru', UKR: 'ua', URU: 'uy', COL: 'co', CHI: 'cl', MEX: 'mx',
  USA: 'us', JPN: 'jp', KOR: 'kr', IRN: 'ir', MAR: 'ma', TUN: 'tn',
  EGY: 'eg', ALG: 'dz', SEN: 'sn', GHA: 'gh', NGA: 'ng', CIV: 'ci',
  CMR: 'cm', RSA: 'za', AUS: 'au', QAT: 'qa', KSA: 'sa', JOR: 'jo',
  IRQ: 'iq', UZB: 'uz', PAR: 'py', PER: 'pe', ECU: 'ec', CAN: 'ca',
  PAN: 'pa', HAI: 'ht', CUW: 'cw', CPV: 'cv', COD: 'cd', BIH: 'ba',
  CZE: 'cz', TUR: 'tr', NZL: 'nz', SVK: 'sk', SVN: 'si', HUN: 'hu',
  ROU: 'ro', BUL: 'bg', FIN: 'fi', ISL: 'is', VEN: 've', BOL: 'bo',
  MEXC: 'mx',
};

/** [[target|display]] 形式のリンク分解（fetch-squads と同実装）。 */
function linkParts(raw: string): { target: string | null; display: string } {
  const s = raw.trim();
  const m = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(s);
  if (m) return { target: m[1].trim(), display: (m[2] ?? m[1]).trim() };
  const clean = s.replace(/\[\[|\]\]/g, '').trim();
  return { target: null, display: clean };
}

/**
 * #38: 出場選手の在籍クラブ取得（設計: notes/design-38-player-clubs.md）。
 *
 * データ源は fetch-squads と同じ Wikipedia「2026 FIFA World Cup squads」の wikitext。
 * 各選手行の club=[[記事タイトル|表示名]] / clubnat=GER を抽出し、
 * clubs を upsert（wiki_title 名寄せ）→ players.club_id を更新する。
 *
 * 使い方:
 *   npx tsx scripts/fetch-clubs.ts JPN FRA   # 指定国のみ（ミニマム検証）
 *   npx tsx scripts/fetch-clubs.ts           # 全48か国
 */

const WIKI_API =
  'https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&page=2026%20FIFA%20World%20Cup%20squads';

// fifaCode -> Wikipedia セクション見出し（fetch-squads と同じ対応表）。
const WIKI_SECTION_OVERRIDE: Record<string, string> = {
  KOR: 'South Korea',
  CZE: 'Czech Republic',
  CIV: 'Ivory Coast',
  COD: 'DR Congo',
  TUR: 'Turkey',
  CPV: 'Cape Verde',
  IRN: 'Iran',
};

type ParsedClubRow = {
  /** 選手の英語表示名（players.name_en と突合する）。 */
  playerName: string;
  clubWikiTitle: string;
  clubDisplay: string;
  clubNat: string | null;
};

/** wiki_title -> clubs.id の slug。 */
function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'club'
  );
}

/** 国セクションの wikitext から「選手名 → クラブ」行を抽出する。 */
function parseClubRows(section: string): ParsedClubRow[] {
  const rows: ParsedClubRow[] = [];
  const re =
    /name=(\[\[[^\]]+\]\])[^\n]*?club=(\[\[[^\]]+\]\]|[^|\n}]+)(?:\|clubnat=([A-Za-z]{3}))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const player = linkParts(m[1]);
    const club = linkParts(m[2].trim());
    const display = club.display.trim();
    // 無所属（Free agent 等・リンク無し短文）はクラブ無しとして登録しない。
    if (!display || /free agent|unattached/i.test(display)) continue;
    rows.push({
      playerName: player.display,
      clubWikiTitle: club.target ?? display,
      clubDisplay: display,
      clubNat: m[3] ? m[3].toUpperCase() : null,
    });
  }
  return rows;
}

/**
 * チーム見出しでセクションを切り出す。squads ページは ==Group A== の下に
 * ===Japan=== が並ぶ構造のため、見出しレベル（= の数）を捉え、
 * 同レベル以下の次見出しで打ち切る（粗い打ち切りだと同組の他国まで混入する）。
 */
function sectionFor(wikitext: string, heading: string): string | null {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^(={2,4})\\s*${esc}\\s*\\1\\s*$`, 'm');
  const m = re.exec(wikitext);
  if (!m) return null;
  const level = m[1].length;
  const start = m.index + m[0].length;
  const rest = wikitext.slice(start);
  const next = new RegExp(`^={2,${level}}[^=]`, 'm').exec(rest);
  return rest.slice(0, next ? next.index : undefined);
}

async function main() {
  const onlyCodes = process.argv
    .slice(2)
    .map((c) => c.toUpperCase())
    .filter((c) => /^[A-Z]{3}$/.test(c));

  const db = getDb();
  const teamsResult = await db.execute({
    sql: onlyCodes.length
      ? `SELECT id, fifa_code, name_en FROM teams WHERE fifa_code IN (${onlyCodes.map(() => '?').join(',')})`
      : 'SELECT id, fifa_code, name_en FROM teams',
    args: onlyCodes,
  });
  const teams = teamsResult.rows as unknown as {
    id: string;
    fifa_code: string;
    name_en: string;
  }[];
  if (teams.length === 0) {
    console.error('対象チームがありません:', onlyCodes.join(','));
    process.exit(1);
  }

  console.log(`Wikipedia squads を取得中…（対象 ${teams.length} か国）`);
  const json = await fetchJsonWithRetry<{ parse?: { wikitext?: { '*': string } } }>(
    WIKI_API,
    { headers: { 'User-Agent': 'wc-tournament-tracker/1.0 (club importer)' } },
  );
  const wikitext = json.parse?.wikitext?.['*'];
  if (!wikitext) throw new Error('wikitext を取得できませんでした');

  let clubsUpserted = 0;
  let playersLinked = 0;
  let unmatched = 0;

  for (const team of teams) {
    const heading = WIKI_SECTION_OVERRIDE[team.fifa_code] ?? team.name_en;
    const section = sectionFor(wikitext, heading);
    if (!section) {
      console.warn(`[${team.fifa_code}] セクション "${heading}" が見つかりません`);
      continue;
    }
    const rows = parseClubRows(section);

    // この国の選手一覧（name_en で突合）。
    const playersResult = await db.execute({
      sql: 'SELECT id, name_en FROM players WHERE team_id = ?',
      args: [team.id],
    });
    const byName = new Map(
      (playersResult.rows as unknown as { id: string; name_en: string }[]).map((p) => [
        p.name_en,
        p.id,
      ]),
    );

    for (const row of rows) {
      const playerId = byName.get(row.playerName);
      if (!playerId) {
        unmatched += 1;
        console.warn(`[${team.fifa_code}] 突合失敗: ${row.playerName}`);
        continue;
      }
      const clubId = slugify(row.clubWikiTitle);
      const iso = row.clubNat ? (CODE_TO_ISO[row.clubNat] ?? null) : null;
      // clubs upsert（wiki_title 名寄せ。name_ja は別ステップで解決するため触らない）。
      await db.execute({
        sql: `INSERT INTO clubs (id, name_en, country_iso, wiki_title)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(wiki_title) DO UPDATE SET
                name_en = excluded.name_en,
                country_iso = COALESCE(excluded.country_iso, clubs.country_iso),
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
        args: [clubId, row.clubDisplay, iso, row.clubWikiTitle],
      });
      clubsUpserted += 1;
      await db.execute({
        sql: 'UPDATE players SET club_id = (SELECT id FROM clubs WHERE wiki_title = ?) WHERE id = ?',
        args: [row.clubWikiTitle, playerId],
      });
      playersLinked += 1;
    }
    console.log(`[${team.fifa_code}] クラブ紐付け ${rows.length} 行処理`);
  }

  console.log(
    `完了: players ${playersLinked} 件に club_id 設定 / clubs upsert ${clubsUpserted} 回 / 突合失敗 ${unmatched} 件`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
