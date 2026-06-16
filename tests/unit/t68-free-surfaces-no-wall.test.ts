import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * T-68 非回帰ガード: 無料で見せ続けるべき面に課金壁を持ち込んでいないことを固定する。
 *
 * 無料面（静的に見る＝無料）:
 *  - ブラケット盤面（スコア込み）: BracketLayout
 *  - 順位/ランキング: rankings/page, RankingsView
 *  - 各グループの素の一覧（アーカイブ的閲覧）: groups/[group]/page
 *
 * これらが PaywallLock / hasKnockoutAccess を参照し始めたら、無料面に壁を被せた退行とみなす。
 * 逆に、ゲート対象の面が hasKnockoutAccess を参照し続けていることも positive control で固定し、
 * 「単にどこも壁を import していないから通っているだけ」の空テスト化を防ぐ。
 *
 * 方針: ソースの静的検査（依存追加の検知）。実描画の分岐は各面の専用テストが担保する。
 */

const srcRoot = fileURLToPath(new URL('../../src/', import.meta.url));

function read(rel: string): string {
  return readFileSync(srcRoot + rel, 'utf8');
}

const FREE_SURFACES = [
  'components/BracketLayout.tsx',
  'app/rankings/page.tsx',
  'components/RankingsView.tsx',
  'app/groups/[group]/page.tsx',
];

const GATED_SURFACES = [
  'components/HomeView.tsx',
  'app/groups/page.tsx',
  'app/favorites/page.tsx',
  'app/matches/[id]/page.tsx',
  'app/favorites/actions.ts',
];

describe('T-68 無料面に課金壁を持ち込まない（非回帰）', () => {
  for (const rel of FREE_SURFACES) {
    it(`${rel} は PaywallLock / hasKnockoutAccess を参照しない`, () => {
      const src = read(rel);
      expect(src).not.toMatch(/PaywallLock/);
      expect(src).not.toMatch(/hasKnockoutAccess/);
    });
  }
});

describe('T-68 positive control: ゲート対象面は壁判定を参照している', () => {
  for (const rel of GATED_SURFACES) {
    it(`${rel} は hasKnockoutAccess を参照する`, () => {
      expect(read(rel)).toMatch(/hasKnockoutAccess/);
    });
  }
});
