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

  it('2026タイブレーク: 直接対決で上回る相手しか同点に来られないなら1位確定（メキシコ実例）', () => {
    // A=メキシコ B=韓国 C=チェコ D=南アフリカ。
    // A はD(2-0)・B(1-0)に勝ち6点。B はC(2-1)に勝ち3点。C-Dは1-1。残り A-C, B-D。
    // 6点に届きうる他チームは B(=3→勝てば6)だけ。A はその B に直接対決で勝っている。
    // 2026の同勝点タイブレークは「全体得失点差」より先に「直接対決」を見るため、
    // A は B と6点で並んでも直接対決で上 = A は1位確定。
    const r = run([
      fin('A', 'D', 2, 0), fin('A', 'B', 1, 0),
      fin('B', 'C', 2, 1), fin('C', 'D', 1, 1),
      pend('A', 'C'), pend('B', 'D'),
    ]);
    expect(r.get('A')).toEqual({ clinchedTop2: true, clinchedPosition: 1 });
  });

  it('2026タイブレーク: 同点になり得る全相手に直接対決で勝っていれば1位確定（USA実例）', () => {
    // A=USA B=豪 C=パラ D=トルコ。A はC(4-1)・B(2-0)に勝ち6点。
    // 6点に届きうるのは B か C の一方（両者は直接対決 B-C が残る）。A は両者に勝っている。
    // よって最終節でAが負け誰かが6点で並んでも、直接対決でA上 = A 1位確定。
    const r = run([
      fin('A', 'C', 4, 1), fin('A', 'B', 2, 0),
      fin('B', 'D', 2, 0), fin('C', 'D', 1, 0),
      pend('A', 'D'), pend('B', 'C'),
    ]);
    expect(r.get('A')).toEqual({ clinchedTop2: true, clinchedPosition: 1 });
  });

  it('2026タイブレーク: 同点になり得る相手に直接対決で負けていれば1位は未確定', () => {
    // 上のメキシコ例で A-B の結果だけ反転（B が A に勝っている）と、
    // B が6点で並んだとき直接対決で B 上 = A は2位もあり得る → 1位未確定。
    const r = run([
      fin('A', 'D', 2, 0), fin('B', 'A', 1, 0),
      fin('B', 'C', 2, 1), fin('C', 'D', 1, 1),
      pend('A', 'C'), pend('B', 'D'),
    ]);
    expect(r.get('A')!.clinchedPosition).toBeNull();
  });

  it('2026タイブレーク: 6点に届きうる相手(B,C)両方に直接対決で勝っていれば1位確定', () => {
    // A=6(2勝, 残りD戦), B=3,C=3,D=0。残り AD, BC。
    // 6点に届きうるのは B か C の一方（B-C が直接対決なので片方のみ）。
    // A は B(1-0)・C(1-0)の両方に勝っている。よって最終節でAが負け、B か C が6点で並んでも、
    // 2026タイブレークの直接対決(a)で A が上 → A は1位確定。
    // （旧実装は勝点のみで「同点脅威があるから未確定」と誤判定していた箇所＝本修正の本丸）。
    const r = run([
      fin('A', 'B', 1, 0), fin('C', 'D', 1, 0),
      fin('A', 'C', 1, 0), fin('B', 'D', 1, 0),
      pend('A', 'D'), pend('B', 'C'),
    ]);
    expect(r.get('A')).toEqual({ clinchedTop2: true, clinchedPosition: 1 });
  });
});
