export type SeedTeam = {
  id: string;
  nameJa: string;
  nameEn: string;
  fifaCode: string;
  flag: string;
  groupName: string | null;
};

// FIFA WC 2026 本抽選結果 (2025-12-05 確定) に基づく 48 チーム全置換版。
// 仮データ (Italy/Peru/Nigeria/Costa Rica/Poland/Denmark) は本大会未出場のため削除。
// id は FIFA コードの 3 文字小文字（一貫性のため）。
export const seedTeams = [
  { id: 'mex', nameJa: 'メキシコ',          nameEn: 'Mexico',                 fifaCode: 'MEX', flag: '🇲🇽', groupName: 'Group A' },
  { id: 'rsa', nameJa: '南アフリカ',         nameEn: 'South Africa',           fifaCode: 'RSA', flag: '🇿🇦', groupName: 'Group A' },
  { id: 'kor', nameJa: '韓国',              nameEn: 'Korea Republic',         fifaCode: 'KOR', flag: '🇰🇷', groupName: 'Group A' },
  { id: 'cze', nameJa: 'チェコ',            nameEn: 'Czechia',                fifaCode: 'CZE', flag: '🇨🇿', groupName: 'Group A' },

  { id: 'can', nameJa: 'カナダ',            nameEn: 'Canada',                 fifaCode: 'CAN', flag: '🇨🇦', groupName: 'Group B' },
  { id: 'bih', nameJa: 'ボスニア・ヘルツェゴビナ', nameEn: 'Bosnia and Herzegovina', fifaCode: 'BIH', flag: '🇧🇦', groupName: 'Group B' },
  { id: 'qat', nameJa: 'カタール',          nameEn: 'Qatar',                  fifaCode: 'QAT', flag: '🇶🇦', groupName: 'Group B' },
  { id: 'sui', nameJa: 'スイス',            nameEn: 'Switzerland',            fifaCode: 'SUI', flag: '🇨🇭', groupName: 'Group B' },

  { id: 'bra', nameJa: 'ブラジル',          nameEn: 'Brazil',                 fifaCode: 'BRA', flag: '🇧🇷', groupName: 'Group C' },
  { id: 'mar', nameJa: 'モロッコ',          nameEn: 'Morocco',                fifaCode: 'MAR', flag: '🇲🇦', groupName: 'Group C' },
  { id: 'hai', nameJa: 'ハイチ',            nameEn: 'Haiti',                  fifaCode: 'HAI', flag: '🇭🇹', groupName: 'Group C' },
  { id: 'sco', nameJa: 'スコットランド',     nameEn: 'Scotland',               fifaCode: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', groupName: 'Group C' },

  { id: 'usa', nameJa: 'アメリカ',          nameEn: 'United States',          fifaCode: 'USA', flag: '🇺🇸', groupName: 'Group D' },
  { id: 'par', nameJa: 'パラグアイ',        nameEn: 'Paraguay',               fifaCode: 'PAR', flag: '🇵🇾', groupName: 'Group D' },
  { id: 'aus', nameJa: 'オーストラリア',     nameEn: 'Australia',              fifaCode: 'AUS', flag: '🇦🇺', groupName: 'Group D' },
  { id: 'tur', nameJa: 'トルコ',            nameEn: 'Türkiye',                fifaCode: 'TUR', flag: '🇹🇷', groupName: 'Group D' },

  { id: 'ger', nameJa: 'ドイツ',            nameEn: 'Germany',                fifaCode: 'GER', flag: '🇩🇪', groupName: 'Group E' },
  { id: 'cuw', nameJa: 'キュラソー',        nameEn: 'Curaçao',                fifaCode: 'CUW', flag: '🇨🇼', groupName: 'Group E' },
  { id: 'civ', nameJa: 'コートジボワール',   nameEn: "Côte d'Ivoire",          fifaCode: 'CIV', flag: '🇨🇮', groupName: 'Group E' },
  { id: 'ecu', nameJa: 'エクアドル',        nameEn: 'Ecuador',                fifaCode: 'ECU', flag: '🇪🇨', groupName: 'Group E' },

  { id: 'ned', nameJa: 'オランダ',          nameEn: 'Netherlands',            fifaCode: 'NED', flag: '🇳🇱', groupName: 'Group F' },
  { id: 'jpn', nameJa: '日本',              nameEn: 'Japan',                  fifaCode: 'JPN', flag: '🇯🇵', groupName: 'Group F' },
  { id: 'swe', nameJa: 'スウェーデン',       nameEn: 'Sweden',                 fifaCode: 'SWE', flag: '🇸🇪', groupName: 'Group F' },
  { id: 'tun', nameJa: 'チュニジア',        nameEn: 'Tunisia',                fifaCode: 'TUN', flag: '🇹🇳', groupName: 'Group F' },

  { id: 'bel', nameJa: 'ベルギー',          nameEn: 'Belgium',                fifaCode: 'BEL', flag: '🇧🇪', groupName: 'Group G' },
  { id: 'egy', nameJa: 'エジプト',          nameEn: 'Egypt',                  fifaCode: 'EGY', flag: '🇪🇬', groupName: 'Group G' },
  { id: 'irn', nameJa: 'イラン',            nameEn: 'IR Iran',                fifaCode: 'IRN', flag: '🇮🇷', groupName: 'Group G' },
  { id: 'nzl', nameJa: 'ニュージーランド',   nameEn: 'New Zealand',            fifaCode: 'NZL', flag: '🇳🇿', groupName: 'Group G' },

  { id: 'esp', nameJa: 'スペイン',          nameEn: 'Spain',                  fifaCode: 'ESP', flag: '🇪🇸', groupName: 'Group H' },
  { id: 'cpv', nameJa: 'カーボベルデ',      nameEn: 'Cabo Verde',             fifaCode: 'CPV', flag: '🇨🇻', groupName: 'Group H' },
  { id: 'ksa', nameJa: 'サウジアラビア',     nameEn: 'Saudi Arabia',           fifaCode: 'KSA', flag: '🇸🇦', groupName: 'Group H' },
  { id: 'uru', nameJa: 'ウルグアイ',        nameEn: 'Uruguay',                fifaCode: 'URU', flag: '🇺🇾', groupName: 'Group H' },

  { id: 'fra', nameJa: 'フランス',          nameEn: 'France',                 fifaCode: 'FRA', flag: '🇫🇷', groupName: 'Group I' },
  { id: 'sen', nameJa: 'セネガル',          nameEn: 'Senegal',                fifaCode: 'SEN', flag: '🇸🇳', groupName: 'Group I' },
  { id: 'irq', nameJa: 'イラク',            nameEn: 'Iraq',                   fifaCode: 'IRQ', flag: '🇮🇶', groupName: 'Group I' },
  { id: 'nor', nameJa: 'ノルウェー',        nameEn: 'Norway',                 fifaCode: 'NOR', flag: '🇳🇴', groupName: 'Group I' },

  { id: 'arg', nameJa: 'アルゼンチン',       nameEn: 'Argentina',              fifaCode: 'ARG', flag: '🇦🇷', groupName: 'Group J' },
  { id: 'alg', nameJa: 'アルジェリア',      nameEn: 'Algeria',                fifaCode: 'ALG', flag: '🇩🇿', groupName: 'Group J' },
  { id: 'aut', nameJa: 'オーストリア',      nameEn: 'Austria',                fifaCode: 'AUT', flag: '🇦🇹', groupName: 'Group J' },
  { id: 'jor', nameJa: 'ヨルダン',          nameEn: 'Jordan',                 fifaCode: 'JOR', flag: '🇯🇴', groupName: 'Group J' },

  { id: 'por', nameJa: 'ポルトガル',        nameEn: 'Portugal',               fifaCode: 'POR', flag: '🇵🇹', groupName: 'Group K' },
  { id: 'cod', nameJa: 'コンゴ民主共和国',   nameEn: 'Congo DR',               fifaCode: 'COD', flag: '🇨🇩', groupName: 'Group K' },
  { id: 'uzb', nameJa: 'ウズベキスタン',     nameEn: 'Uzbekistan',             fifaCode: 'UZB', flag: '🇺🇿', groupName: 'Group K' },
  { id: 'col', nameJa: 'コロンビア',        nameEn: 'Colombia',               fifaCode: 'COL', flag: '🇨🇴', groupName: 'Group K' },

  { id: 'eng', nameJa: 'イングランド',       nameEn: 'England',                fifaCode: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', groupName: 'Group L' },
  { id: 'cro', nameJa: 'クロアチア',        nameEn: 'Croatia',                fifaCode: 'CRO', flag: '🇭🇷', groupName: 'Group L' },
  { id: 'gha', nameJa: 'ガーナ',            nameEn: 'Ghana',                  fifaCode: 'GHA', flag: '🇬🇭', groupName: 'Group L' },
  { id: 'pan', nameJa: 'パナマ',            nameEn: 'Panama',                 fifaCode: 'PAN', flag: '🇵🇦', groupName: 'Group L' },
] satisfies SeedTeam[];

export type TeamRatingSeed = {
  /** 現在の FIFA ランク（小さいほど強い）。 */
  fifaRank: number;
  /** 直近3大会の最終順位（FIFA 公式最終順位 1〜32、未出場は null）。 */
  wc2014Place: number | null;
  wc2018Place: number | null;
  wc2022Place: number | null;
};

// 優勝国予想で使う静的レーティング。teamId をキーに seed 時へ投入する。
// snapshot: FIFAランク = 2026-06-10 時点 (football-ranking.com)。
//           過去順位 = 2014/2018/2022 各大会の FIFA 公式最終順位。
// ※ 商用公開前に必ず最終検算すること（特に 2022 大会 17〜32 位の並び、
//    および各国の出場/未出場の取り違えに注意）。
export const teamRatings: Record<string, TeamRatingSeed> = {
  mex: { fifaRank: 15, wc2014Place: 10, wc2018Place: 12, wc2022Place: 21 },
  rsa: { fifaRank: 60, wc2014Place: null, wc2018Place: null, wc2022Place: null },
  kor: { fifaRank: 25, wc2014Place: 27, wc2018Place: 19, wc2022Place: 16 },
  cze: { fifaRank: 41, wc2014Place: null, wc2018Place: null, wc2022Place: null },

  can: { fifaRank: 30, wc2014Place: null, wc2018Place: null, wc2022Place: 31 },
  bih: { fifaRank: 64, wc2014Place: 20, wc2018Place: null, wc2022Place: null },
  qat: { fifaRank: 55, wc2014Place: null, wc2018Place: null, wc2022Place: 32 },
  sui: { fifaRank: 19, wc2014Place: 11, wc2018Place: 14, wc2022Place: 12 },

  bra: { fifaRank: 6, wc2014Place: 4, wc2018Place: 6, wc2022Place: 7 },
  mar: { fifaRank: 7, wc2014Place: null, wc2018Place: 25, wc2022Place: 4 },
  hai: { fifaRank: 82, wc2014Place: null, wc2018Place: null, wc2022Place: null },
  sco: { fifaRank: 43, wc2014Place: null, wc2018Place: null, wc2022Place: null },

  usa: { fifaRank: 16, wc2014Place: 15, wc2018Place: null, wc2022Place: 14 },
  par: { fifaRank: 40, wc2014Place: null, wc2018Place: null, wc2022Place: null },
  aus: { fifaRank: 27, wc2014Place: 30, wc2018Place: 28, wc2022Place: 11 },
  tur: { fifaRank: 22, wc2014Place: null, wc2018Place: null, wc2022Place: null },

  ger: { fifaRank: 10, wc2014Place: 1, wc2018Place: 22, wc2022Place: 25 },
  cuw: { fifaRank: 83, wc2014Place: null, wc2018Place: null, wc2022Place: null },
  civ: { fifaRank: 34, wc2014Place: 21, wc2018Place: null, wc2022Place: null },
  ecu: { fifaRank: 24, wc2014Place: 17, wc2018Place: null, wc2022Place: 18 },

  ned: { fifaRank: 8, wc2014Place: 3, wc2018Place: null, wc2022Place: 5 },
  jpn: { fifaRank: 18, wc2014Place: 29, wc2018Place: 13, wc2022Place: 9 },
  swe: { fifaRank: 38, wc2014Place: null, wc2018Place: 7, wc2022Place: null },
  tun: { fifaRank: 46, wc2014Place: null, wc2018Place: 24, wc2022Place: 19 },

  bel: { fifaRank: 9, wc2014Place: 6, wc2018Place: 3, wc2022Place: 22 },
  egy: { fifaRank: 29, wc2014Place: null, wc2018Place: 29, wc2022Place: null },
  irn: { fifaRank: 21, wc2014Place: 28, wc2018Place: 18, wc2022Place: 29 },
  nzl: { fifaRank: 85, wc2014Place: null, wc2018Place: null, wc2022Place: null },

  esp: { fifaRank: 2, wc2014Place: 23, wc2018Place: 10, wc2022Place: 13 },
  cpv: { fifaRank: 68, wc2014Place: null, wc2018Place: null, wc2022Place: null },
  ksa: { fifaRank: 61, wc2014Place: null, wc2018Place: 31, wc2022Place: 20 },
  uru: { fifaRank: 17, wc2014Place: 12, wc2018Place: 5, wc2022Place: 23 },

  fra: { fifaRank: 1, wc2014Place: 7, wc2018Place: 1, wc2022Place: 2 },
  sen: { fifaRank: 14, wc2014Place: null, wc2018Place: 17, wc2022Place: 10 },
  irq: { fifaRank: 57, wc2014Place: null, wc2018Place: null, wc2022Place: null },
  nor: { fifaRank: 31, wc2014Place: null, wc2018Place: null, wc2022Place: null },

  arg: { fifaRank: 3, wc2014Place: 2, wc2018Place: 15, wc2022Place: 1 },
  alg: { fifaRank: 28, wc2014Place: 14, wc2018Place: null, wc2022Place: null },
  aut: { fifaRank: 23, wc2014Place: null, wc2018Place: null, wc2022Place: null },
  jor: { fifaRank: 63, wc2014Place: null, wc2018Place: null, wc2022Place: null },

  por: { fifaRank: 5, wc2014Place: 18, wc2018Place: 16, wc2022Place: 8 },
  cod: { fifaRank: 45, wc2014Place: null, wc2018Place: null, wc2022Place: null },
  uzb: { fifaRank: 50, wc2014Place: null, wc2018Place: null, wc2022Place: null },
  col: { fifaRank: 13, wc2014Place: 5, wc2018Place: 9, wc2022Place: null },

  eng: { fifaRank: 4, wc2014Place: 26, wc2018Place: 4, wc2022Place: 6 },
  cro: { fifaRank: 11, wc2014Place: 19, wc2018Place: 2, wc2022Place: 3 },
  gha: { fifaRank: 73, wc2014Place: 25, wc2018Place: null, wc2022Place: 24 },
  pan: { fifaRank: 33, wc2014Place: null, wc2018Place: 32, wc2022Place: null },
};

// Group → Position → teamId への参照テーブル。
// グループステージ試合の home/away slot ('A1' 〜 'L4') から teamId を解決する際に使う。
export const groupPositionToTeamId: Record<string, string> = (() => {
  const result: Record<string, string> = {};
  const groupBuckets = new Map<string, string[]>();
  for (const team of seedTeams) {
    if (!team.groupName) continue;
    const letter = team.groupName.replace(/^Group\s+/, '');
    const bucket = groupBuckets.get(letter) ?? [];
    bucket.push(team.id);
    groupBuckets.set(letter, bucket);
  }
  for (const [letter, ids] of groupBuckets) {
    ids.forEach((teamId, index) => {
      result[`${letter}${index + 1}`] = teamId;
    });
  }
  return result;
})();

export type RoundOf32Assignment = {
  matchId: number;
  homeTeamId: string;
  awayTeamId: string;
};

// 旧来はラウンド32 (id 73-88) のホーム/アウェイを直接 seed 時点で割り当てていたが、
// 本大会では「グループ 1 位 / 2 位 / 3 位通過」がグループステージ終了後に確定するため、
// seed 時点では NULL のままにする（後で bracket_edges による伝播 or 手動入力で埋まる）。
// 後方互換のため空配列で型シグネチャだけ残す。
export const roundOf32Assignments: RoundOf32Assignment[] = [];
