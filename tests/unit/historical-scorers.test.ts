import { describe, expect, it } from 'vitest';

import {
  HISTORICAL_WC_SCORERS,
  mergeHistoricalScorers,
} from '@/lib/historical-scorers';
import type { ScorerStat } from '@/lib/rankings';

function scorer(playerName: string, fifaCode: string | null, goals: number): ScorerStat {
  return { playerName, fifaCode, nameEn: null, nameJa: null, goals };
}

describe('historical WC scorers data', () => {
  it('全エントリが通算10得点以上で必須項目を持つ', () => {
    expect(HISTORICAL_WC_SCORERS.length).toBeGreaterThanOrEqual(10);
    for (const h of HISTORICAL_WC_SCORERS) {
      expect(h.baseGoals).toBeGreaterThanOrEqual(10);
      expect(h.name.length).toBeGreaterThan(0);
      expect(h.country.length).toBeGreaterThan(0);
      expect(h.fifaCode).toMatch(/^[A-Z]{3}$/);
      expect(h.span.length).toBeGreaterThan(0);
    }
  });

  it('現役フラグ(live2026)は Messi と Mbappé のみ', () => {
    const active = HISTORICAL_WC_SCORERS.filter((h) => h.live2026).map((h) => h.name);
    expect(active).toEqual(['Lionel Messi', 'Kylian Mbappé']);
  });
});

describe('mergeHistoricalScorers', () => {
  it('ライブ得点が無ければ baseGoals のまま・通算降順・現役フラグ整合', () => {
    const resolved = mergeHistoricalScorers([]);

    // 降順ソートされている
    for (let i = 1; i < resolved.length; i += 1) {
      expect(resolved[i - 1].goals).toBeGreaterThanOrEqual(resolved[i].goals);
    }
    // 引退選手は加算0
    const klose = resolved.find((r) => r.name === 'Miroslav Klose');
    expect(klose?.goals).toBe(16);
    expect(klose?.active2026).toBe(false);
    expect(klose?.liveGoals2026).toBe(0);

    const messi = resolved.find((r) => r.name === 'Lionel Messi');
    expect(messi?.goals).toBe(13);
    expect(messi?.active2026).toBe(true);
    expect(messi?.liveGoals2026).toBe(0);
  });

  it('現役選手は2026ライブ得点を加算し、通算が伸びれば順位が繰り上がる', () => {
    // 第19試合型の実データを模す: Messi(ARG) 4点 / Mbappé(FRA) 2点。
    const live = [scorer('Messi', 'ARG', 4), scorer('Mbappé', 'FRA', 2)];
    const resolved = mergeHistoricalScorers(live);

    const messi = resolved.find((r) => r.name === 'Lionel Messi');
    expect(messi?.goals).toBe(17); // 13 + 4
    expect(messi?.liveGoals2026).toBe(4);

    const mbappe = resolved.find((r) => r.name === 'Kylian Mbappé');
    expect(mbappe?.goals).toBe(14); // 12 + 2
    expect(mbappe?.liveGoals2026).toBe(2);

    // Messi 17 が Klose 16 を抜いて先頭になる
    expect(resolved[0].name).toBe('Lionel Messi');
  });

  it('名前突合は大文字小文字・ダイアクリティカル非依存（fifaCode も一致必須）', () => {
    const live = [
      scorer('L. MESSI', 'ARG', 1), // 大文字・イニシャル
      scorer('messi', 'BRA', 9), // fifaCode 不一致 → 無視
    ];
    const messi = mergeHistoricalScorers(live).find((r) => r.name === 'Lionel Messi');
    expect(messi?.goals).toBe(14); // 13 + 1（BRA の偽 messi は加算しない）
  });

  it('引退選手は同姓のライブ得点があっても加算しない', () => {
    // 引退の Müller 勢に対し、別人の "Müller" がライブにいても通算は固定。
    const live = [scorer('Müller', 'GER', 5)];
    const resolved = mergeHistoricalScorers(live);
    expect(resolved.find((r) => r.name === 'Gerd Müller')?.goals).toBe(14);
    expect(resolved.find((r) => r.name === 'Thomas Müller')?.goals).toBe(10);
  });
});
