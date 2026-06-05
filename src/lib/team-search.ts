import type { Team } from '@/db/queries';

/**
 * 検索クエリがチームのいずれかのフィールドに部分一致するか。
 *
 * - 日本語名は `String.includes` で素朴に判定（大文字小文字の概念がないため）。
 * - 英語名・FIFA コードは小文字に揃えてから判定する。
 * - 前後の空白は trim して扱う。空文字なら全件マッチとして扱う。
 *
 * /favorites のチーム選択コンボボックスと、ホームの出場国エクスプローラの両方で共用する。
 */
export function matchesTeamQuery(
  team: Pick<Team, 'nameJa' | 'nameEn' | 'fifaCode'>,
  rawQuery: string,
): boolean {
  const query = rawQuery.trim();
  if (!query) return true;
  const lower = query.toLowerCase();
  if (team.nameJa.includes(query)) return true;
  if (team.nameEn.toLowerCase().includes(lower)) return true;
  if (team.fifaCode.toLowerCase().includes(lower)) return true;
  return false;
}
