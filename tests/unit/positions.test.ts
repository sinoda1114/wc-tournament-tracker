import { describe, expect, it } from 'vitest';

import { classifyPosition, POSITION_GROUP_ORDER } from '@/lib/positions';

describe('classifyPosition', () => {
  it('GK 判定', () => {
    expect(classifyPosition('Goalkeeper')).toBe('GK');
  });

  it('GK/DF/MF/FW の略号を直接判定（Wikipedia形式）', () => {
    expect(classifyPosition('GK')).toBe('GK');
    expect(classifyPosition('DF')).toBe('DF');
    expect(classifyPosition('MF')).toBe('MF');
    expect(classifyPosition('FW')).toBe('FW');
  });

  it('DF 判定（各種バック・ディフェンダー）', () => {
    expect(classifyPosition('Centre-Back')).toBe('DF');
    expect(classifyPosition('Left-Back')).toBe('DF');
    expect(classifyPosition('Right Wing-Back')).toBe('DF');
    expect(classifyPosition('Defender')).toBe('DF');
    expect(classifyPosition('Sweeper')).toBe('DF');
  });

  it('MF 判定', () => {
    expect(classifyPosition('Defensive Midfield')).toBe('MF');
    expect(classifyPosition('Central Midfield')).toBe('MF');
    expect(classifyPosition('Attacking Midfield')).toBe('MF');
  });

  it('FW 判定', () => {
    expect(classifyPosition('Centre-Forward')).toBe('FW');
    expect(classifyPosition('Striker')).toBe('FW');
    expect(classifyPosition('Left Winger')).toBe('FW');
  });

  it('未知/空は OTHER', () => {
    expect(classifyPosition(null)).toBe('OTHER');
    expect(classifyPosition('')).toBe('OTHER');
    expect(classifyPosition('Substitute')).toBe('OTHER');
  });

  it('グループ順は GK<DF<MF<FW<OTHER', () => {
    expect(POSITION_GROUP_ORDER.GK).toBeLessThan(POSITION_GROUP_ORDER.DF);
    expect(POSITION_GROUP_ORDER.DF).toBeLessThan(POSITION_GROUP_ORDER.MF);
    expect(POSITION_GROUP_ORDER.MF).toBeLessThan(POSITION_GROUP_ORDER.FW);
    expect(POSITION_GROUP_ORDER.FW).toBeLessThan(POSITION_GROUP_ORDER.OTHER);
  });
});
