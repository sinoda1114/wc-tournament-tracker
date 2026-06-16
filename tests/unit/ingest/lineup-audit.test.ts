import { describe, expect, it } from 'vitest';

import { auditLineups, type LineupAuditMatch } from '@/lib/ingest/lineup-audit';

/**
 * T-92: 先発XI被覆監査（auditLineups）の単体テスト。
 *
 * Wikipedia への実アクセスは `fetchHtml` 注入で遮断する。被覆結果（ok/partial/missing/fetch_failed）が
 * それぞれ正しい所見種別（lineup_*）にマップされること、対象外（チーム/グループ未確定）はスキップされること、
 * ok は所見を出さないことを検証する。
 */

const POS = ['GK', 'RB', 'CB', 'CB', 'LB', 'DM', 'CM', 'CM', 'RW', 'CF', 'LW'];

function lineupTable(prefix: string, count: number): string {
  const rows = Array.from({ length: count }, (_, i) => {
    const pos = POS[i] ?? 'CM';
    return `<tr><td>${pos}</td><td>${i + 1}</td><td>${prefix} ${i + 1}</td></tr>`;
  }).join('');
  return `<table style="font-size:90%"><tbody>${rows}</tbody></table>`;
}

function articleHtml(homeName: string, awayName: string, homeCount: number, awayCount: number): string {
  const id = `${homeName.replace(/ /g, '_')}_vs_${awayName.replace(/ /g, '_')}`;
  return (
    `<div class="mw-heading mw-heading3"><h3 id="${id}">${homeName} vs ${awayName}</h3></div>` +
    lineupTable('H', homeCount) +
    lineupTable('A', awayCount) +
    `<div class="mw-heading mw-heading3"><h3 id="Next_vs_Match">Next</h3></div>`
  );
}

function match(overrides: Partial<LineupAuditMatch> = {}): LineupAuditMatch {
  return {
    id: 14,
    groupLetter: 'H',
    home: { nameEn: 'Spain', fifaCode: 'ESP' },
    away: { nameEn: 'Cape Verde', fifaCode: 'CPV' },
    ...overrides,
  };
}

describe('auditLineups（T-92）', () => {
  it('両チーム11人なら所見なし', async () => {
    const html = articleHtml('Spain', 'Cape Verde', 11, 11);
    const findings = await auditLineups([match()], { fetchHtml: async () => html });
    expect(findings).toEqual([]);
  });

  it('片側欠落は lineup_partial（warn）', async () => {
    const html = articleHtml('Spain', 'Cape Verde', 11, 5);
    const findings = await auditLineups([match()], { fetchHtml: async () => html });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ matchId: 14, kind: 'lineup_partial', severity: 'warn' });
    expect(findings[0].context).toMatchObject({ homeCount: 11, awayCount: 5 });
  });

  it('見出し不在は lineup_missing（warn）', async () => {
    const html = articleHtml('Germany', 'Japan', 11, 11);
    const findings = await auditLineups([match()], { fetchHtml: async () => html });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ matchId: 14, kind: 'lineup_missing', severity: 'warn' });
  });

  it('取得失敗は lineup_fetch_failed（warn・エラー文を保持）', async () => {
    const findings = await auditLineups([match()], {
      fetchHtml: async () => {
        throw new Error('timeout');
      },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ matchId: 14, kind: 'lineup_fetch_failed', severity: 'warn' });
    expect(findings[0].context.error).toBe('timeout');
  });

  it('グループ/チーム未確定はスキップ（fetchもしない＝誤検知しない）', async () => {
    let called = 0;
    const fetchHtml = async () => {
      called += 1;
      return '';
    };
    const findings = await auditLineups(
      [
        match({ groupLetter: null }),
        match({ home: null }),
        match({ away: { nameEn: '', fifaCode: null } }),
      ],
      { fetchHtml },
    );
    expect(findings).toEqual([]);
    expect(called).toBe(0);
  });

  it('同一グループの複数試合は記事を1回だけ取得する（health遅延の直列累積を防ぐ）', async () => {
    let calls = 0;
    const html = articleHtml('Spain', 'Cape Verde', 11, 11);
    const fetchHtml = async () => {
      calls += 1;
      return html;
    };
    const findings = await auditLineups(
      [
        match({ id: 14, groupLetter: 'H' }),
        match({ id: 15, groupLetter: 'H' }), // 同グループ
        match({ id: 16, groupLetter: 'H' }), // 同グループ
      ],
      { fetchHtml },
    );
    expect(findings).toEqual([]); // 全試合 Spain vs Cape Verde 扱い＝ok
    expect(calls).toBe(1); // グループHは1回だけ取得
  });

  it('複数試合の所見を全件返す', async () => {
    const ok = articleHtml('Spain', 'Cape Verde', 11, 11);
    const partial = articleHtml('Brazil', 'Morocco', 11, 4);
    const fetchHtml = async (title: string) =>
      title.includes('Group H') ? ok : partial;
    const findings = await auditLineups(
      [
        match({ id: 14, groupLetter: 'H' }),
        match({ id: 20, groupLetter: 'G', home: { nameEn: 'Brazil', fifaCode: 'BRA' }, away: { nameEn: 'Morocco', fifaCode: 'MAR' } }),
      ],
      { fetchHtml },
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ matchId: 20, kind: 'lineup_partial' });
  });
});
