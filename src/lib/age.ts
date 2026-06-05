/**
 * 生年月日（'YYYY-MM-DD' 等の Date.parse 可能な文字列）から満年齢を計算する。
 *
 * - `dateBorn` が null/空/解析不能なら null を返す。
 * - `asOf` 省略時は現在日時を基準にする。
 * - 誕生日がまだ来ていない年は 1 引く（満年齢）。
 */
export function calcAge(
  dateBorn: string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!dateBorn) return null;
  const born = new Date(dateBorn);
  if (Number.isNaN(born.getTime())) return null;

  let age = asOf.getFullYear() - born.getFullYear();
  const monthDiff = asOf.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < born.getDate())) {
    age -= 1;
  }

  if (age < 0 || age > 120) return null;
  return age;
}
