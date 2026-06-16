import { describe, expect, it } from 'vitest';

import {
  fetchMatchLineupCoverage,
  type LineupTeamRef,
} from '@/lib/lineup/wikipedia-lineup';

/**
 * T-92: 先発XI被覆チェック（fetchMatchLineupCoverage）の単体テスト。
 *
 * 実 Wikipedia へはアクセスせず、レンダリング後HTMLを模した最小 fixture を `fetchHtml` 注入で渡し、
 * ok / partial / missing(各reason) / fetch_failed を区別できることを検証する。
 * （/matches/14 で先発XIが無言で消えた事象＝この分類が監査で可視化されるべき、の回帰防止）
 */

const POS = ['GK', 'RB', 'CB', 'CB', 'LB', 'DM', 'CM', 'CM', 'RW', 'CF', 'LW'];

/** N人ぶんの font-size:90% ラインアップテーブルを作る（posCode/番号/名前の3セル行）。 */
function lineupTable(prefix: string, count: number): string {
  const rows = Array.from({ length: count }, (_, i) => {
    const pos = POS[i] ?? 'CM';
    return `<tr><td>${pos}</td><td>${i + 1}</td><td>${prefix} Player ${i + 1}</td></tr>`;
  }).join('');
  return `<table class="x" style="font-size:90%"><tbody>${rows}</tbody></table>`;
}

/** "Home_vs_Away" 見出し＋home/awayテーブル＋次見出しを含む記事HTMLを作る。 */
function articleHtml(
  homeName: string,
  awayName: string,
  homeCount: number,
  awayCount: number,
  opts: { tables?: number } = {},
): string {
  const id = `${homeName.replace(/ /g, '_')}_vs_${awayName.replace(/ /g, '_')}`;
  const tableCount = opts.tables ?? 2;
  const tables = [
    tableCount >= 1 ? lineupTable('H', homeCount) : '',
    tableCount >= 2 ? lineupTable('A', awayCount) : '',
  ].join('');
  return (
    `<div class="mw-heading mw-heading3"><h3 id="${id}">${homeName} vs ${awayName}</h3></div>` +
    tables +
    `<div class="mw-heading mw-heading3"><h3 id="Next_vs_Match">Next vs Match</h3></div>`
  );
}

const SPAIN: LineupTeamRef = { nameEn: 'Spain', fifaCode: 'ESP' };
const CPV: LineupTeamRef = { nameEn: 'Cape Verde', fifaCode: 'CPV' };

function withHtml(html: string | null) {
  return { fetchHtml: async () => html };
}

describe('fetchMatchLineupCoverage（T-92 先発XI被覆）', () => {
  it('両チーム11人なら ok（home/away の人数を返す）', async () => {
    const html = articleHtml('Spain', 'Cape Verde', 11, 11);
    const cov = await fetchMatchLineupCoverage(
      { home: SPAIN, away: CPV, groupLetter: 'H' },
      withHtml(html),
    );
    expect(cov).toEqual({ status: 'ok', homeCount: 11, awayCount: 11 });
  });

  it('片側が11人未満なら partial', async () => {
    const html = articleHtml('Spain', 'Cape Verde', 11, 7);
    const cov = await fetchMatchLineupCoverage(
      { home: SPAIN, away: CPV, groupLetter: 'H' },
      withHtml(html),
    );
    expect(cov).toEqual({ status: 'partial', homeCount: 11, awayCount: 7 });
  });

  it('該当見出しが無ければ missing(section)', async () => {
    const html = articleHtml('Germany', 'Japan', 11, 11); // 別カードのみ
    const cov = await fetchMatchLineupCoverage(
      { home: SPAIN, away: CPV, groupLetter: 'H' },
      withHtml(html),
    );
    expect(cov).toEqual({ status: 'missing', reason: 'section' });
  });

  it('見出しはあるがラインアップ表が揃わなければ missing(tables)', async () => {
    const html = articleHtml('Spain', 'Cape Verde', 11, 11, { tables: 1 });
    const cov = await fetchMatchLineupCoverage(
      { home: SPAIN, away: CPV, groupLetter: 'H' },
      withHtml(html),
    );
    expect(cov).toEqual({ status: 'missing', reason: 'tables' });
  });

  it('fetchHtml が throw したら fetch_failed（メッセージを保持）', async () => {
    const cov = await fetchMatchLineupCoverage(
      { home: SPAIN, away: CPV, groupLetter: 'H' },
      {
        fetchHtml: async () => {
          throw new Error('boom');
        },
      },
    );
    expect(cov).toEqual({ status: 'fetch_failed', error: 'boom' });
  });

  it('fetchHtml が null（非200/本文なし）なら fetch_failed', async () => {
    const cov = await fetchMatchLineupCoverage(
      { home: SPAIN, away: CPV, groupLetter: 'H' },
      withHtml(null),
    );
    expect(cov.status).toBe('fetch_failed');
  });

  it('チーム名/グループ未指定は missing(article)（fetchせず誤検知しない）', async () => {
    let called = false;
    const cov = await fetchMatchLineupCoverage(
      { home: { nameEn: '', fifaCode: null }, away: CPV, groupLetter: 'H' },
      {
        fetchHtml: async () => {
          called = true;
          return '';
        },
      },
    );
    expect(cov).toEqual({ status: 'missing', reason: 'article' });
    expect(called).toBe(false);
  });

  it('見出しが逆順（Away_vs_Home）でも home/away を正しく対応づける', async () => {
    // 記事上は Cape Verde vs Spain の順だが、論理 home=Spain として人数が入れ替わらないこと。
    const html = articleHtml('Cape Verde', 'Spain', 8, 11); // 表1=CapeVerde(8), 表2=Spain(11)
    const cov = await fetchMatchLineupCoverage(
      { home: SPAIN, away: CPV, groupLetter: 'H' },
      withHtml(html),
    );
    // reversed 一致 → homeXi=表2(Spain,11), awayXi=表1(CapeVerde,8)
    expect(cov).toEqual({ status: 'partial', homeCount: 11, awayCount: 8 });
  });
});

/**
 * T-92 追補: DB の nameEn と Wikipedia 見出し名が食い違うチームのエイリアス回帰。
 *
 * /matches/14（Spain vs Cape Verde）が本番で欠落した真因は、DB の nameEn が 'Cabo Verde' なのに
 * Wikipedia 見出しが 'Cape Verde' で、WIKI_TEAM_NAME_ALIAS に CPV が無く見出しに一致しなかったこと。
 * 既存テストは fixture を 'Cape Verde'（=Wikipedia名）でハードコードしていたため緑のまま本番だけ落ちた。
 * 以後は **実 DB 値**を渡し、エイリアスで Wikipedia 見出しへ橋渡しできることを検証する（全グループ網羅監査で判明した3件）。
 */
describe('fetchMatchLineupCoverage（DB名→Wikipedia見出しエイリアス回帰）', () => {
  const cases: ReadonlyArray<{ dbNameEn: string; fifaCode: string; wikiName: string; group: string }> = [
    { dbNameEn: 'Cabo Verde', fifaCode: 'CPV', wikiName: 'Cape Verde', group: 'H' },
    { dbNameEn: 'Congo DR', fifaCode: 'COD', wikiName: 'DR Congo', group: 'K' },
    { dbNameEn: 'IR Iran', fifaCode: 'IRN', wikiName: 'Iran', group: 'G' },
  ];

  for (const c of cases) {
    it(`DB '${c.dbNameEn}'(${c.fifaCode}) は Wikipedia見出し '${c.wikiName}' に一致して ok になる`, async () => {
      // 記事の見出しは Wikipedia 表記。away に実 DB の nameEn を渡す。
      const html = articleHtml('Spain', c.wikiName, 11, 11);
      const cov = await fetchMatchLineupCoverage(
        {
          home: SPAIN,
          away: { nameEn: c.dbNameEn, fifaCode: c.fifaCode },
          groupLetter: c.group,
        },
        withHtml(html),
      );
      // エイリアスが無いと missing(section) になる（＝本番で起きた欠落）。
      expect(cov).toEqual({ status: 'ok', homeCount: 11, awayCount: 11 });
    });
  }
});
