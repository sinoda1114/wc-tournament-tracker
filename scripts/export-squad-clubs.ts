import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

import { getDb } from '../src/db/client';

/**
 * #38 ファクトチェック用データ書き出し。
 * 国 × 選手 × 所属クラブの「主張（claims）」を 1 ファイルにまとめ、
 * 独立ソースとの突き合わせ（notes/factcheck-38/REQUEST.md）に使う。
 *
 *   npx tsx scripts/export-squad-clubs.ts
 */
async function main() {
  const db = getDb();
  const teams = (
    await db.execute(
      'SELECT id, fifa_code, name_en, name_ja FROM teams ORDER BY fifa_code',
    )
  ).rows as unknown as {
    id: string;
    fifa_code: string;
    name_en: string;
    name_ja: string | null;
  }[];

  const generatedAt = new Date().toISOString();
  const body: string[] = [];

  let total = 0;
  for (const team of teams) {
    const players = (
      await db.execute({
        sql: `SELECT p.number, p.position, p.name_en, p.name_ja,
                     c.name_en AS club_en, c.name_ja AS club_ja, c.country_iso AS club_iso
              FROM players p LEFT JOIN clubs c ON c.id = p.club_id
              WHERE p.team_id = ?
              ORDER BY p.sort_order ASC, p.name ASC`,
        args: [team.id],
      })
    ).rows as unknown as {
      number: string | null;
      position: string | null;
      name_en: string | null;
      name_ja: string | null;
      club_en: string | null;
      club_ja: string | null;
      club_iso: string | null;
    }[];

    body.push(
      `## ${team.fifa_code} — ${team.name_en}${team.name_ja ? `（${team.name_ja}）` : ''}  [${players.length}名]`,
      '',
      '| # | 選手(EN) | 選手(JA) | Pos | 所属クラブ(EN) | クラブ(JA) | リーグ国 |',
      '|--:|---|---|---|---|---|---|',
    );
    for (const p of players) {
      total += 1;
      body.push(
        `| ${p.number ?? ''} | ${p.name_en ?? ''} | ${p.name_ja ?? ''} | ${p.position ?? ''} | ${p.club_en ?? '（未設定）'} | ${p.club_ja ?? ''} | ${p.club_iso ?? ''} |`,
      );
    }
    body.push('');
  }

  const lines = [
    '# #38 照合データ: 出場国 × 選手 × 所属クラブ',
    '',
    `生成日時(UTC): ${generatedAt}`,
    `総選手数: ${total} / 出場国: ${teams.length}`,
    'データ源: English Wikipedia「2026 FIFA World Cup squads」wikitext（club= / clubnat=）',
    '基準: 大会登録名簿時点（≒ 2026-06-01）。直前の移籍は反映されない場合があります。',
    '',
    '> このファイルは検証対象（＝当方の主張）です。各行を独立ソースと突き合わせてください。',
    '> 手順は `notes/factcheck-38/REQUEST.md` を参照。',
    '',
    ...body,
  ];

  const outDir = resolve(process.cwd(), 'notes/factcheck-38');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'squad-clubs-data.md');
  writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`書き出し: ${outPath}（${total} 行）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
