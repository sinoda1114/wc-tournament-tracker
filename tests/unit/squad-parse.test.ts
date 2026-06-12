import { describe, expect, test } from 'vitest';

import { parseCoach } from '../../scripts/lib/squad-parse';

describe('parseCoach', () => {
  test('旧形式 {{flagicon|XXX}} の旗付き監督をパースできる', () => {
    const section = 'Coach: {{flagicon|ITA}} [[Carlo Ancelotti]]';

    const coach = parseCoach(section);

    expect(coach).toEqual({
      name: 'Carlo Ancelotti',
      nameJa: null,
      flagCode: 'ITA',
      link: 'Carlo Ancelotti',
    });
  });

  test('新形式 {{#invoke:flag|icon|XXX}} の旗付き監督をパースできる（ENG=Tuchel）', () => {
    const section = 'Coach: {{#invoke:flag|icon|GER}} [[Thomas Tuchel]]';

    const coach = parseCoach(section);

    expect(coach).toEqual({
      name: 'Thomas Tuchel',
      nameJa: null,
      flagCode: 'GER',
      link: 'Thomas Tuchel',
    });
  });

  test('旗なし（自国監督）をパースできる', () => {
    const section = 'Coach: [[Hajime Moriyasu|Moriyasu]]';

    const coach = parseCoach(section);

    expect(coach).toEqual({
      name: 'Moriyasu',
      nameJa: null,
      flagCode: null,
      link: 'Hajime Moriyasu',
    });
  });

  test('Coach 行が無いセクションでは null を返す', () => {
    expect(parseCoach('no coach line here')).toBeNull();
  });
});
