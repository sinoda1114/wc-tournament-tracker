import { describe, expect, it } from 'vitest';

import { clinchGroupQualification } from '@/lib/clinch';

const teams = ['A', 'B', 'C', 'D'].map((id) => ({ id }));

/** 消化済み試合（home hs - as away）。 */
const fin = (h: string, a: string, hs: number, as: number) =>
  ({ homeTeamId: h, awayTeamId: a, homeScore: hs, awayScore: as, status: 'finished' as const });
/** 未消化試合。 */
const pend = (h: string, a: string) =>
  ({ homeTeamId: h, awayTeamId: a, homeScore: null, awayScore: null, status: 'scheduled' as const });

const run = (matches: ReturnType<typeof fin | typeof pend>[]) =>
  clinchGroupQualification(teams, matches);

describe('clinchGroupQualification', () => {
  it('全消化: 1位/2位を確定（A=9, B=6, C=3, D=0）', () => {
    const r = run([
      fin('A', 'B', 1, 0), fin('A', 'C', 1, 0), fin('A', 'D', 1, 0),
      fin('B', 'C', 1, 0), fin('B', 'D', 1, 0), fin('C', 'D', 1, 0),
    ]);
    expect(r.get('A')).toEqual({ clinchedTop2: true, clinchedPosition: 1 });
    expect(r.get('B')).toEqual({ clinchedTop2: true, clinchedPosition: 2 });
    expect(r.get('C')!.clinchedTop2).toBe(false);
    expect(r.get('D')!.clinchedTop2).toBe(false);
  });

  it('Aが全勝で残り試合あり → 1位確定（B/C/D は未確定）', () => {
    // A は3試合消化で9点。残りは B-C-D の総当たり3試合。誰も9に届かない。
    const r = run([
      fin('A', 'B', 1, 0), fin('A', 'C', 1, 0), fin('A', 'D', 1, 0),
      pend('B', 'C'), pend('B', 'D'), pend('C', 'D'),
    ]);
    expect(r.get('A')).toEqual({ clinchedTop2: true, clinchedPosition: 1 });
    for (const id of ['B', 'C', 'D']) expect(r.get(id)!.clinchedTop2).toBe(false);
  });

  it('A,B が C,D に全勝・直接対決のみ未消化 → 両者突破確定だが順位は未定', () => {
    const r = run([
      fin('A', 'C', 1, 0), fin('A', 'D', 1, 0),
      fin('B', 'C', 1, 0), fin('B', 'D', 1, 0),
      fin('C', 'D', 1, 0),
      pend('A', 'B'), // 直接対決だけ残り
    ]);
    expect(r.get('A')).toEqual({ clinchedTop2: true, clinchedPosition: null });
    expect(r.get('B')).toEqual({ clinchedTop2: true, clinchedPosition: null });
    expect(r.get('C')!.clinchedTop2).toBe(false);
    expect(r.get('D')!.clinchedTop2).toBe(false);
  });

  it('A=9確定・B=6で残りCD一つ → A 1位確定・B 2位確定', () => {
    const r = run([
      fin('A', 'B', 1, 0), fin('A', 'C', 1, 0), fin('A', 'D', 1, 0),
      fin('B', 'C', 1, 0), fin('B', 'D', 1, 0),
      pend('C', 'D'),
    ]);
    expect(r.get('A')).toEqual({ clinchedTop2: true, clinchedPosition: 1 });
    expect(r.get('B')).toEqual({ clinchedTop2: true, clinchedPosition: 2 });
  });

  it('1巡目だけ消化（早すぎ） → 誰も確定しない', () => {
    const r = run([
      fin('A', 'B', 1, 0), fin('C', 'D', 1, 0),
      pend('A', 'C'), pend('A', 'D'), pend('B', 'C'), pend('B', 'D'),
    ]);
    for (const id of ['A', 'B', 'C', 'D']) {
      expect(r.get(id)).toEqual({ clinchedTop2: false, clinchedPosition: null });
    }
  });

  it('勝点同点が2チームあり得るなら未確定（安全側）', () => {
    // A=6(2勝, 残りD戦), B=3,C=3,D=0。B,C は残りで6に届き得る → A は同点脅威2つの可能性。
    // 具体: 残り AD, BC。B が C に勝てば B=6、A が D に負ければ A=6 で B 単独上=Aは2位以内。
    // しかし C が B に勝てば C=6、さらに… いずれにせよ #>=A は最大1（BC は片方しか6に行けない）。
    // ここでは「A は top2 確定だが1位でも2位でもない」ことを確認（境界の健全性）。
    const r = run([
      fin('A', 'B', 1, 0), fin('C', 'D', 1, 0),
      fin('A', 'C', 1, 0), fin('B', 'D', 1, 0),
      pend('A', 'D'), pend('B', 'C'),
    ]);
    expect(r.get('A')!.clinchedTop2).toBe(true);
    expect(r.get('A')!.clinchedPosition).toBeNull();
  });
});
