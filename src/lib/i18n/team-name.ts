import type { Locale } from './config';

/**
 * ロケールに応じたチーム表示名を返す。
 *
 * DB には日本語名(nameJa)と英語名(nameEn)しか無い。日本語ロケールは nameJa、
 * それ以外（en / es / pt / zh …）はラテン文字の英語名 nameEn にフォールバックする
 * （日本語のまま出さない）。team が無ければ空文字。
 */
export function localizedTeamName(
  team: { nameJa: string; nameEn: string } | null | undefined,
  locale: Locale,
): string {
  if (!team) return '';
  return locale === 'ja' ? team.nameJa : team.nameEn;
}
