/**
 * FIFA World Cup 2026 「ベスト3位通過」割当テーブル（全 495 通り）の生成スクリプト。
 *
 * 出典: FIFA 公式 Competition Regulations Annex C を Wikipedia がそのまま転記した
 *   Template:2026_FIFA_World_Cup_third-place_table の wikitext。
 *   https://en.wikipedia.org/wiki/Template:2026_FIFA_World_Cup_third-place_table
 *
 * 本スクリプトは「再現性・出典追跡」のために残す。実行時には上記テンプレの生 wikitext
 * （`action=raw`）を取得 → パース → `src/lib/third-place.ts` の `THIRD_PLACE_ALLOCATIONS`
 * と同形のコンパクト表（[通過8グループ, ホスト順割当8文字]）を標準出力に吐く。
 *
 * 手書き転記をゼロにすることで、495 行のヒューマンエラーを排除する意図。
 * 生成結果は `src/lib/third-place.ts` に焼き込み済み（このスクリプトの実行は不要）。
 *
 * 使い方:
 *   curl -s 'https://en.wikipedia.org/w/index.php?title=Template:2026_FIFA_World_Cup_third-place_table&action=raw' \
 *     -o /tmp/3rd.wikitext
 *   npx tsx scripts/gen-third-place-table.ts /tmp/3rd.wikitext
 *
 * パース結果が以下の不変条件をすべて満たさなければ異常終了する（壊れた表を焼き込まない安全弁）:
 *   1. 行数がちょうど 495
 *   2. 各行の通過グループが 8、割当が 8
 *   3. 全 495 通過集合がユニーク（C(12,8)=495 を完全網羅）
 *   4. 割当先の集合 == 通過集合（過不足なく全通過チームに割当）
 *   5. 自グループ回避（ホスト 1X に 3X を割り当てない）
 */
import { readFileSync } from 'node:fs';

// 割当列のホスト順（wikitext ヘッダの "1A vs / 1B vs / 1D vs / ..." の並び）。
// これは Round of 32 のホスト試合 79,85,81,74,82,77,87,80 に 1:1 対応する。
const HOST_ORDER = ['A', 'B', 'D', 'E', 'G', 'I', 'K', 'L'] as const;

type ParsedRow = { no: number; qualified: string; assign: string };

function parseWikitext(txt: string): ParsedRow[] {
  const lines = txt.split('\n');
  const rows: ParsedRow[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const header = lines[i].match(/^!\s*scope="row"\s*\|\s*(\d+)\s*$/);
    if (!header) continue;
    const no = Number(header[1]);

    // 直後の '|' データ行を、次の行ヘッダ or 表終端まで結合する。
    const cells: string[] = [];
    let j = i + 1;
    while (j < lines.length && !/^!\s*scope="row"/.test(lines[j]) && !/^\|\}/.test(lines[j])) {
      const l = lines[j];
      if (/^\|/.test(l)) {
        const parts = l
          .replace(/^\|-?\s*/, '')
          .split('||')
          .map((s) => s.trim());
        cells.push(...parts);
      }
      j += 1;
    }
    i = j - 1;

    const groups: string[] = [];
    const assigns: string[] = [];
    for (const raw of cells) {
      const c = raw.replace(/'''/g, '').replace(/^!.*$/, '').trim();
      if (/^3[A-L]$/.test(c)) assigns.push(c[1]);
      else if (/^[A-L]$/.test(c)) groups.push(c);
      // 空セル（非通過グループ）は無視。
    }

    if (groups.length !== 8 || assigns.length !== 8) {
      throw new Error(`行 ${no}: 期待した 8 グループ / 8 割当が得られない (groups=${groups.length}, assigns=${assigns.length})`);
    }

    const map: Record<string, string> = {};
    HOST_ORDER.forEach((host, idx) => {
      map[host] = assigns[idx];
    });

    rows.push({
      no,
      qualified: [...groups].sort().join(''),
      assign: HOST_ORDER.map((h) => map[h]).join(''),
    });
  }

  return rows;
}

function assertInvariants(rows: ParsedRow[]): void {
  if (rows.length !== 495) {
    throw new Error(`行数が 495 ではない: ${rows.length}`);
  }
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.qualified)) throw new Error(`通過集合が重複: ${r.qualified}`);
    seen.add(r.qualified);

    const assignSet = [...new Set(r.assign.split(''))].sort().join('');
    if (assignSet !== r.qualified) {
      throw new Error(`行 ${r.no}: 割当先集合 ${assignSet} が通過集合 ${r.qualified} と一致しない`);
    }
    HOST_ORDER.forEach((host, idx) => {
      if (r.assign[idx] === host) {
        throw new Error(`行 ${r.no}: 自グループ割当 (1${host} vs 3${host})`);
      }
    });
  }
}

function main(): void {
  const path = process.argv[2];
  if (!path) {
    console.error('使い方: npx tsx scripts/gen-third-place-table.ts <wikitext-file>');
    process.exitCode = 1;
    return;
  }

  const rows = parseWikitext(readFileSync(path, 'utf8'));
  assertInvariants(rows);

  // src/lib/third-place.ts の THIRD_PLACE_ALLOCATIONS に貼れる形で出力。
  const body = rows
    .sort((a, b) => a.no - b.no)
    .map((r) => `  ['${r.qualified}', '${r.assign}'],`)
    .join('\n');
  process.stdout.write(`${body}\n`);
  console.error(`OK: ${rows.length} 行を検証して出力した（ホスト順 ${HOST_ORDER.join(',')}）`);
}

main();
