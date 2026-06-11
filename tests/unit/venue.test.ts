import { describe, expect, it } from 'vitest';

import type { VenueMatchSummary } from '@/db/queries';
import {
  formatCapacity,
  formatElevation,
  formatPastWorldCups,
  formatVenueStageSummary,
  isHighAltitude,
  roofTypeLabel,
  surfaceLabel,
} from '@/lib/venue';

describe('formatCapacity', () => {
  it('inserts thousands separators', () => {
    expect(formatCapacity(83000)).toBe('83,000');
    expect(formatCapacity(94000)).toBe('94,000');
  });

  it('returns null for null', () => {
    expect(formatCapacity(null)).toBeNull();
  });
});

describe('roofTypeLabel', () => {
  it('maps each roof type to Japanese', () => {
    expect(roofTypeLabel('retractable')).toBe('開閉式屋根（空調あり）');
    expect(roofTypeLabel('translucent')).toBe('半屋根（屋外・空調なし）');
    expect(roofTypeLabel('open')).toBe('屋外');
  });

  it('returns null for null', () => {
    expect(roofTypeLabel(null)).toBeNull();
  });
});

describe('surfaceLabel', () => {
  it('notes indoor installation only for retractable roofs', () => {
    expect(surfaceLabel('retractable')).toBe('天然芝（ハイブリッド・屋内設置）');
    expect(surfaceLabel('open')).toBe('天然芝（ハイブリッド）');
    expect(surfaceLabel('translucent')).toBe('天然芝（ハイブリッド）');
    expect(surfaceLabel(null)).toBe('天然芝（ハイブリッド）');
  });
});

describe('isHighAltitude', () => {
  it('flags 1500m and above', () => {
    expect(isHighAltitude(2200)).toBe(true);
    expect(isHighAltitude(1560)).toBe(true);
    expect(isHighAltitude(1500)).toBe(true);
  });

  it('does not flag low elevations or null', () => {
    expect(isHighAltitude(490)).toBe(false);
    expect(isHighAltitude(null)).toBe(false);
  });
});

describe('formatElevation', () => {
  it('formats with unit and separators', () => {
    expect(formatElevation(2200)).toBe('標高 2,200m');
  });

  it('returns null for null', () => {
    expect(formatElevation(null)).toBeNull();
  });
});

describe('formatPastWorldCups', () => {
  it('notes all-final hosting for multiple years', () => {
    expect(
      formatPastWorldCups([
        { year: 1986, final: true },
        { year: 1970, final: true },
      ]),
    ).toBe('1970年・1986年 W杯（いずれも決勝開催）');
  });

  it('notes single final-hosting year', () => {
    expect(formatPastWorldCups([{ year: 1970, final: true }])).toBe(
      '1970年 W杯（決勝開催）',
    );
  });

  it('omits the final note when not all years hosted the final', () => {
    expect(
      formatPastWorldCups([
        { year: 1994, final: false },
        { year: 1970, final: true },
      ]),
    ).toBe('1970年・1994年 W杯');
  });

  it('returns null for an empty list', () => {
    expect(formatPastWorldCups([])).toBeNull();
  });
});

describe('formatVenueStageSummary', () => {
  it('summarizes total and per-stage counts with Japanese labels', () => {
    const summary: VenueMatchSummary = {
      total: 6,
      byStage: [
        { stage: 'group_stage', count: 4 },
        { stage: 'round_of_32', count: 1 },
        { stage: 'final', count: 1 },
      ],
    };
    expect(formatVenueStageSummary(summary)).toBe(
      '全6試合（グループリーグ 4試合・ラウンド32 1試合・決勝 1試合）',
    );
  });

  it('returns null when the venue hosts no matches', () => {
    expect(formatVenueStageSummary({ total: 0, byStage: [] })).toBeNull();
  });
});
