import { describe, expect, it } from 'vitest';

import {
  ALLOCATION_HOST_ORDER,
  THIRD_PLACE_ALLOCATIONS,
  THIRD_PLACE_HOST_MATCHES,
  assignThirdPlaceSlots,
  type GroupLetter,
} from '@/lib/third-place';

const ALL_GROUPS: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// seed-matches.ts の third place スロット候補集合（host=グループ1位文字 → 候補5グループ）。
// FIFA 公式割当がこの候補制約に従うことを検証するための独立な真値。
const SEED_CANDIDATES: Record<string, string> = {
  E: 'ABCDF', // 試合74 'Group A/B/C/D/F third place'（1E の相手）
  I: 'CDFGH', // 試合77 'Group C/D/F/G/H third place'
  A: 'CEFHI', // 試合79 'Group C/E/F/H/I third place'
  L: 'EHIJK', // 試合80 'Group E/H/I/J/K third place'
  D: 'BEFIJ', // 試合81 'Group B/E/F/I/J third place'
  G: 'AEHIJ', // 試合82 'Group A/E/H/I/J third place'
  B: 'EFGIJ', // 試合85 'Group E/F/G/I/J third place'
  K: 'DEIJL', // 試合87 'Group D/E/I/J/L third place'
};

describe('THIRD_PLACE_ALLOCATIONS テーブルの正典性', () => {
  it('ちょうど 495 通り (= C(12,8)) 存在する', () => {
    expect(THIRD_PLACE_ALLOCATIONS.length).toBe(495);
  });

  it('通過集合がすべてユニーク（全組合せを網羅）', () => {
    const keys = new Set(THIRD_PLACE_ALLOCATIONS.map(([q]) => q));
    expect(keys.size).toBe(495);
  });

  it('各行: 通過8グループ・割当8文字で、両者の文字種が一致する', () => {
    for (const [qualified, assign] of THIRD_PLACE_ALLOCATIONS) {
      expect(qualified).toHaveLength(8);
      expect(assign).toHaveLength(8);
      // 通過集合は昇順・重複なし
      expect([...qualified].sort().join('')).toBe(qualified);
      // 割当先の集合 == 通過集合（全通過チームに過不足なく割当）
      expect([...new Set(assign.split(''))].sort().join('')).toBe(qualified);
    }
  });

  it('自グループ回避: ホスト 1X に 3X を割り当てない', () => {
    for (const [, assign] of THIRD_PLACE_ALLOCATIONS) {
      ALLOCATION_HOST_ORDER.forEach((host, idx) => {
        expect(assign[idx]).not.toBe(host);
      });
    }
  });

  it('全割当が seed の候補集合制約（各試合に来うる5グループ）に収まる', () => {
    for (const [, assign] of THIRD_PLACE_ALLOCATIONS) {
      ALLOCATION_HOST_ORDER.forEach((host, idx) => {
        const group = assign[idx];
        expect(SEED_CANDIDATES[host]).toContain(group);
      });
    }
  });

  it('ホスト試合の定義が seed と一致（試合ID×ホスト1位）', () => {
    // THIRD_PLACE_HOST_MATCHES は seed-matches.ts の third place 試合と一致する。
    const expected = new Map<number, string>([
      [74, 'E'],
      [77, 'I'],
      [79, 'A'],
      [80, 'L'],
      [81, 'D'],
      [82, 'G'],
      [85, 'B'],
      [87, 'K'],
    ]);
    expect(THIRD_PLACE_HOST_MATCHES).toHaveLength(8);
    for (const { matchId, host } of THIRD_PLACE_HOST_MATCHES) {
      expect(expected.get(matchId)).toBe(host);
    }
  });
});

describe('assignThirdPlaceSlots', () => {
  it('既知の組合せ（A,B,C,D,E,F,G,H 通過）を正しく割り当てる', () => {
    // 表の最終行 ['ABCDEFGH','HGBCAFDE']。ALLOCATION_HOST_ORDER = A,B,D,E,G,I,K,L。
    //   1A=3H, 1B=3G, 1D=3B, 1E=3C, 1G=3A, 1I=3F, 1K=3D, 1L=3E
    const result = assignThirdPlaceSlots(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    expect(result).not.toBeNull();
    const byMatch = new Map(result!.map((r) => [r.matchId, r.thirdPlaceGroup]));
    // ホスト → 試合: A=79, B=85, D=81, E=74, G=82, I=77, K=87, L=80
    expect(byMatch.get(79)).toBe('H'); // 1A
    expect(byMatch.get(85)).toBe('G'); // 1B
    expect(byMatch.get(81)).toBe('B'); // 1D
    expect(byMatch.get(74)).toBe('C'); // 1E
    expect(byMatch.get(82)).toBe('A'); // 1G
    expect(byMatch.get(77)).toBe('F'); // 1I
    expect(byMatch.get(87)).toBe('D'); // 1K
    expect(byMatch.get(80)).toBe('E'); // 1L
  });

  it('返す割当は THIRD_PLACE_HOST_MATCHES と同じ試合・ホスト順、3位グループは通過8グループの集合に一致', () => {
    const qualified = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const result = assignThirdPlaceSlots(qualified)!;
    expect(result.map((r) => r.matchId)).toEqual(THIRD_PLACE_HOST_MATCHES.map((h) => h.matchId));
    expect(result.map((r) => r.host)).toEqual(THIRD_PLACE_HOST_MATCHES.map((h) => h.host));
    expect([...new Set(result.map((r) => r.thirdPlaceGroup))].sort().join('')).toBe(
      [...qualified].sort().join(''),
    );
  });

  it('入力の順不同・小文字・重複を正規化して同じ結果を返す', () => {
    const a = assignThirdPlaceSlots(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    const b = assignThirdPlaceSlots(['h', 'g', 'a', 'b', 'c', 'd', 'e', 'f', 'a', 'h']);
    expect(b).toEqual(a);
  });

  it('8グループでない入力は null', () => {
    expect(assignThirdPlaceSlots(['A', 'B', 'C'])).toBeNull();
    expect(assignThirdPlaceSlots(ALL_GROUPS)).toBeNull(); // 12個
    expect(assignThirdPlaceSlots([])).toBeNull();
  });

  it('全 495 組合せで割当が成立し、自グループ回避を満たす', () => {
    // 12グループから8つ選ぶ全組合せを生成し、すべて割当可能であることを確認。
    let count = 0;
    for (let mask = 0; mask < 1 << 12; mask += 1) {
      // popcount===8 のみ
      let bits = 0;
      for (let i = 0; i < 12; i += 1) bits += (mask >> i) & 1;
      if (bits !== 8) continue;
      const combo = ALL_GROUPS.filter((_, i) => (mask >> i) & 1);
      const result = assignThirdPlaceSlots(combo);
      expect(result, `combo=${combo.join('')}`).not.toBeNull();
      for (const a of result!) {
        expect(a.thirdPlaceGroup).not.toBe(a.host);
        expect(combo).toContain(a.thirdPlaceGroup);
      }
      count += 1;
    }
    expect(count).toBe(495);
  });
});
