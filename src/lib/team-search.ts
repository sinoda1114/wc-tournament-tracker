import type { Team } from '@/db/queries';

/**
 * 検索用にクエリ／対象文字列を正規化する。
 * - NFKC: 全角英数・互換文字を畳む（ＢＲＡ→BRA）。
 * - toLowerCase: 英字の大小を無視。
 * - NFD + ラテン結合文字除去: アクセントを無視（México→mexico）。日本語の濁点(U+3099)は
 *   除去対象外だが、クエリ・対象の双方を同じ正規化に通すため一致は保たれる。
 * - ひらがな→カタカナ: かな種別を無視（ぶらじる⇄ブラジル）。
 */
function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

/**
 * 検索クエリがチームのいずれかのフィールド（日本語名・英語名・FIFAコード）に
 * 部分一致するか。かな種別・全角半角・大文字小文字・ラテンのアクセントを無視する。
 * 前後の空白は trim し、空クエリは全件マッチとして扱う。
 *
 * /favorites のチーム選択コンボボックスと、ホームの出場国エクスプローラの両方で共用する。
 */
export function matchesTeamQuery(
  team: Pick<Team, 'nameJa' | 'nameEn' | 'fifaCode'>,
  rawQuery: string,
): boolean {
  const query = normalize(rawQuery.trim());
  if (!query) return true;
  return (
    normalize(team.nameJa).includes(query) ||
    normalize(team.nameEn).includes(query) ||
    normalize(team.fifaCode).includes(query)
  );
}
