/**
 * 歴代 FIFA ワールドカップ（男子）通算得点ランキング（T-109）。
 *
 * 出典: Wikipedia "List of FIFA World Cup top goalscorers"（得点記録＝事実/統計データのため
 * 著作権の対象外。散文の転載はしない）。本モジュールが持つ `baseGoals` は
 * **2022年大会終了時点で確定した通算W杯得点** を静的ベースとする。
 *
 * 設計の肝（=「最新値をどこから取るか」の答え）:
 *   現役で2026大会に出場中の選手（Messi / Mbappé）は、引退していないので通算得点が伸びる。
 *   その2026分は **我々のDBが既に集計しているライブ得点（ScorerStat）** を `mergeHistoricalScorers`
 *   で加算して career total を自動更新する。外部API・手動更新は不要で、2026のソースは
 *   「自分たちの試合データ」に一本化される（Wikipedia のライブ編集値には依存しない）。
 */
import type { ScorerStat } from './rankings';

/** 静的に持つ歴代得点者（2022年大会終了時点の確定値）。 */
export type HistoricalScorer = {
  /** 選手名（表示用・ラテン表記）。 */
  name: string;
  /** 国名（表示用・英語）。歴史国（西ドイツ等）はその当時名を残す。 */
  country: string;
  /** 国旗表示に使う FIFA コード。歴史国は現代の継承国コード（西ドイツ→GER 等）。 */
  fifaCode: string;
  /** 2022年大会終了時点の確定通算W杯得点（静的ベース）。 */
  baseGoals: number;
  /** 出場した大会年の範囲（表示用ラベル。例: '2002–2014'）。 */
  span: string;
  /**
   * 2026大会に現役出場中の選手のみ設定。我々のライブ得点（ScorerStat）と突合する条件。
   * `nameMatch` は正規化（小文字・ダイアクリティカル除去）後の **部分一致** 文字列。
   * 未設定＝引退済みで通算は固定。
   */
  live2026?: { fifaCode: string; nameMatch: string };
};

/** 表示用に算出済みの歴代得点者（baseGoals に2026ライブ得点を加算したもの）。 */
export type ResolvedHistoricalScorer = {
  name: string;
  country: string;
  fifaCode: string;
  /** 通算得点（baseGoals + 2026ライブ得点）。 */
  goals: number;
  span: string;
  /** 2026大会に現役出場中（バッジ表示用）。 */
  active2026: boolean;
  /** 2026大会で加算された得点数（>0 のとき「+N」表示に使える）。 */
  liveGoals2026: number;
};

/**
 * 2022年大会終了時点の通算得点が **10得点以上**（＝二桁）の選手（事実データ）。
 * 同点は通算降順→年代の自然順で安定的に並べてある（表示時は再ソートする）。
 */
export const HISTORICAL_WC_SCORERS: readonly HistoricalScorer[] = [
  { name: 'Miroslav Klose', country: 'Germany', fifaCode: 'GER', baseGoals: 16, span: '2002–2014' },
  { name: 'Ronaldo', country: 'Brazil', fifaCode: 'BRA', baseGoals: 15, span: '1998–2006' },
  { name: 'Gerd Müller', country: 'West Germany', fifaCode: 'GER', baseGoals: 14, span: '1970–1974' },
  { name: 'Just Fontaine', country: 'France', fifaCode: 'FRA', baseGoals: 13, span: '1958' },
  {
    name: 'Lionel Messi',
    country: 'Argentina',
    fifaCode: 'ARG',
    baseGoals: 13,
    span: '2006–2022',
    live2026: { fifaCode: 'ARG', nameMatch: 'messi' },
  },
  { name: 'Pelé', country: 'Brazil', fifaCode: 'BRA', baseGoals: 12, span: '1958–1970' },
  {
    name: 'Kylian Mbappé',
    country: 'France',
    fifaCode: 'FRA',
    baseGoals: 12,
    span: '2018–2022',
    live2026: { fifaCode: 'FRA', nameMatch: 'mbapp' },
  },
  { name: 'Sándor Kocsis', country: 'Hungary', fifaCode: 'HUN', baseGoals: 11, span: '1954' },
  { name: 'Jürgen Klinsmann', country: 'Germany', fifaCode: 'GER', baseGoals: 11, span: '1990–1998' },
  { name: 'Helmut Rahn', country: 'West Germany', fifaCode: 'GER', baseGoals: 10, span: '1954–1958' },
  { name: 'Gabriel Batistuta', country: 'Argentina', fifaCode: 'ARG', baseGoals: 10, span: '1994–2002' },
  { name: 'Teófilo Cubillas', country: 'Peru', fifaCode: 'PER', baseGoals: 10, span: '1970–1978' },
  { name: 'Grzegorz Lato', country: 'Poland', fifaCode: 'POL', baseGoals: 10, span: '1974–1982' },
  { name: 'Gary Lineker', country: 'England', fifaCode: 'ENG', baseGoals: 10, span: '1986–1990' },
  { name: 'Thomas Müller', country: 'Germany', fifaCode: 'GER', baseGoals: 10, span: '2010–2022' },
];

/** 表示名の正規化（小文字化＋ダイアクリティカル除去）。突合のブレを吸収する。 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * 静的ベースに2026大会のライブ得点（我々のDB集計）を加算し、通算降順で並べ替えて返す。
 * 引退選手は加算0で固定。現役（live2026 あり）は fifaCode 一致かつ名前部分一致の得点を合算する。
 */
export function mergeHistoricalScorers(
  liveScorers: readonly ScorerStat[],
): ResolvedHistoricalScorer[] {
  const resolved = HISTORICAL_WC_SCORERS.map((h) => {
    let liveGoals = 0;
    if (h.live2026) {
      for (const s of liveScorers) {
        if (
          s.fifaCode === h.live2026.fifaCode &&
          normalizeName(s.playerName).includes(h.live2026.nameMatch)
        ) {
          liveGoals += s.goals;
        }
      }
    }
    return {
      name: h.name,
      country: h.country,
      fifaCode: h.fifaCode,
      goals: h.baseGoals + liveGoals,
      span: h.live2026 ? h.span.replace(/\d{4}$/, '2026') : h.span,
      active2026: Boolean(h.live2026),
      liveGoals2026: liveGoals,
    } satisfies ResolvedHistoricalScorer;
  });

  // 通算得点の降順で安定ソート（同点は元の並び＝年代順を維持）。
  return resolved
    .map((r, index) => ({ r, index }))
    .sort((a, b) => b.r.goals - a.r.goals || a.index - b.index)
    .map(({ r }) => r);
}
