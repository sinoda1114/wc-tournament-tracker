import type { Team } from '@/db/queries';

/**
 * FIFA 大陸連盟による出場国の分類。
 *
 * 連盟は固定情報なので DB には持たず、FIFA コード → 連盟の静的マップで解決する。
 * `/teams`（出場国エクスプローラ）の大陸別グルーピングに使う。
 */

export type Confederation =
  | 'AFC'
  | 'UEFA'
  | 'CONMEBOL'
  | 'CAF'
  | 'CONCACAF'
  | 'OFC';

export const CONFEDERATION_LABELS: Record<Confederation, string> = {
  AFC: 'アジア',
  UEFA: 'ヨーロッパ',
  CONMEBOL: '南米',
  CAF: 'アフリカ',
  CONCACAF: '北中米カリブ',
  OFC: 'オセアニア',
};

// セクションの表示順。日本人の関心が高い順＝強豪が多いヨーロッパ→南米、
// 次に（日本が属する）アジア、その後はアフリカ→北中米カリブ→オセアニア。
export const CONFEDERATION_ORDER: Confederation[] = [
  'UEFA',
  'CONMEBOL',
  'AFC',
  'CAF',
  'CONCACAF',
  'OFC',
];

// FIFA 3文字コード → 所属大陸連盟。FIFA WC2026 出場 48 カ国分（2025-12-05 本抽選確定）。
const FIFA_TO_CONFEDERATION: Record<string, Confederation> = {
  // AFC（アジア）
  JPN: 'AFC',
  KOR: 'AFC',
  AUS: 'AFC',
  IRN: 'AFC',
  KSA: 'AFC',
  QAT: 'AFC',
  IRQ: 'AFC',
  JOR: 'AFC',
  UZB: 'AFC',
  // UEFA（ヨーロッパ）
  ESP: 'UEFA',
  FRA: 'UEFA',
  GER: 'UEFA',
  ENG: 'UEFA',
  POR: 'UEFA',
  NED: 'UEFA',
  CRO: 'UEFA',
  SUI: 'UEFA',
  AUT: 'UEFA',
  SCO: 'UEFA',
  NOR: 'UEFA',
  CZE: 'UEFA',
  BEL: 'UEFA',
  TUR: 'UEFA',
  SWE: 'UEFA',
  BIH: 'UEFA',
  // CONMEBOL（南米）
  BRA: 'CONMEBOL',
  ARG: 'CONMEBOL',
  URU: 'CONMEBOL',
  COL: 'CONMEBOL',
  ECU: 'CONMEBOL',
  PAR: 'CONMEBOL',
  // CAF（アフリカ）
  MAR: 'CAF',
  SEN: 'CAF',
  TUN: 'CAF',
  EGY: 'CAF',
  ALG: 'CAF',
  CIV: 'CAF',
  GHA: 'CAF',
  RSA: 'CAF',
  CPV: 'CAF',
  COD: 'CAF',
  // CONCACAF（北中米カリブ）
  USA: 'CONCACAF',
  MEX: 'CONCACAF',
  CAN: 'CONCACAF',
  PAN: 'CONCACAF',
  HAI: 'CONCACAF',
  CUW: 'CONCACAF',
  // OFC（オセアニア）
  NZL: 'OFC',
};

export function confederationOf(
  fifaCode: string | null | undefined,
): Confederation | null {
  if (!fifaCode) return null;
  return FIFA_TO_CONFEDERATION[fifaCode.toUpperCase()] ?? null;
}

export type ConfederationGroup = {
  key: Confederation;
  label: string;
  teams: Team[];
};

/**
 * チーム配列を連盟別にまとめる。
 * - セクションは {@link CONFEDERATION_ORDER} 順。
 * - 各連盟内は英語名のアルファベット順（全ロケール共通）。
 * - 所属不明（マップ外）チームは除外し、空の連盟も結果から落とす。
 */
export function groupTeamsByConfederation(teams: Team[]): ConfederationGroup[] {
  const buckets = new Map<Confederation, Team[]>();
  for (const conf of CONFEDERATION_ORDER) {
    buckets.set(conf, []);
  }

  for (const team of teams) {
    const conf = confederationOf(team.fifaCode);
    if (!conf) continue;
    buckets.get(conf)!.push(team);
  }

  for (const list of buckets.values()) {
    // 並びは英語名のアルファベット昇順で全ロケール共通（検索リスト等と統一）。
    list.sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en'));
  }

  return CONFEDERATION_ORDER.map((conf) => ({
    key: conf,
    label: CONFEDERATION_LABELS[conf],
    teams: buckets.get(conf)!,
  })).filter((group) => group.teams.length > 0);
}
