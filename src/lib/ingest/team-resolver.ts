/** 名寄せに必要なチームの最小情報。 */
export type ResolverTeam = {
  id: string;
  nameEn: string;
  fifaCode: string;
};

/**
 * 取得元の英語名 → 正規化キー で引く別名テーブル。
 * 我々の `nameEn` / `fifaCode` と表記が異なるケースだけを定義する
 * （一致するものは正規化フォールバックで拾える）。
 */
const ALIASES: Record<string, string> = {
  'south korea': 'kor',
  korea: 'kor',
  turkey: 'tur',
  'ivory coast': 'civ',
  'dr congo': 'cod',
  'democratic republic of the congo': 'cod',
  'cape verde': 'cpv',
  iran: 'irn',
  'czech republic': 'cze',
  // TheSportsDB は "Bosnia-Herzegovina"（"and" 無し）で返す。
  'bosnia herzegovina': 'bih',
};

/** 小文字化・アクセント除去・記号/連続空白の正規化。 */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // ダイアクリティクス（結合文字）除去
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * 取得元のチーム名を我々の teamId に解決する純関数。
 * 1) 別名テーブル → 2) nameEn 正規化一致 → 3) FIFAコード一致 の順。解決不可なら null。
 */
export function resolveTeamId(name: string, teams: ResolverTeam[]): string | null {
  const norm = normalize(name);
  if (!norm) return null;

  const aliasId = ALIASES[norm];
  if (aliasId) return aliasId;

  for (const team of teams) {
    if (normalize(team.nameEn) === norm) return team.id;
  }

  const upper = name.trim().toUpperCase();
  for (const team of teams) {
    if (team.fifaCode.toUpperCase() === upper) return team.id;
  }

  return null;
}
