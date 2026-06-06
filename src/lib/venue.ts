/**
 * 会場情報カードの表示整形ユーティリティ（純粋関数のみ）。
 *
 * DB から来る生の値（収容人数・屋根タイプ・標高・過去W杯・ステージ集計）を
 * 表示文字列へ変換する。ja は日本語、それ以外（en/es/pt/zh）は英語に統一する。
 */

import type {
  VenueMatchSummary,
  VenuePastWorldCup,
  VenueRoofType,
} from '@/db/queries';
import { type MatchStage } from '@/lib/bracket';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';

/** この高度(m)以上を「高地」として強調する。 */
export const HIGH_ALTITUDE_THRESHOLD_M = 1500;

export function formatCapacity(capacity: number | null): string | null {
  if (capacity === null || !Number.isFinite(capacity)) return null;
  return capacity.toLocaleString('en-US');
}

export function roofTypeLabel(
  roofType: VenueRoofType | null,
  locale: Locale = 'ja',
): string | null {
  const ja = locale === 'ja';
  switch (roofType) {
    case 'retractable':
      return ja ? '開閉式屋根（空調あり）' : 'Retractable roof (climate-controlled)';
    case 'translucent':
      return ja ? '半屋根（屋外・空調なし）' : 'Partial roof (open-air, no AC)';
    case 'open':
      return ja ? '屋外' : 'Open-air';
    default:
      return null;
  }
}

/**
 * 2026 は全会場が天然芝（ハイブリッド）。屋内（開閉式屋根）会場のみ「屋内設置」を補足する。
 */
export function surfaceLabel(
  roofType: VenueRoofType | null,
  locale: Locale = 'ja',
): string {
  const ja = locale === 'ja';
  if (roofType === 'retractable') {
    return ja ? '天然芝（ハイブリッド・屋内設置）' : 'Natural hybrid grass (indoor)';
  }
  return ja ? '天然芝（ハイブリッド）' : 'Natural hybrid grass';
}

export function isHighAltitude(elevationM: number | null): boolean {
  return elevationM !== null && elevationM >= HIGH_ALTITUDE_THRESHOLD_M;
}

export function formatElevation(
  elevationM: number | null,
  locale: Locale = 'ja',
): string | null {
  if (elevationM === null || !Number.isFinite(elevationM)) return null;
  const m = elevationM.toLocaleString('en-US');
  return locale === 'ja' ? `標高 ${m}m` : `Elevation ${m} m`;
}

/**
 * 過去W杯開催歴を整形する。
 * ja: 「1970年・1986年 W杯（いずれも決勝開催）」/ en: 「1970, 1986 World Cup (all hosted the final)」。
 * 全開催年が決勝開催ならその注記を付す。空配列は null。
 */
export function formatPastWorldCups(
  cups: VenuePastWorldCup[],
  locale: Locale = 'ja',
): string | null {
  if (cups.length === 0) return null;
  const years = [...cups].sort((a, b) => a.year - b.year);
  const allFinal = years.every((c) => c.final);

  if (locale === 'ja') {
    const yearText = years.map((c) => `${c.year}年`).join('・');
    if (allFinal) {
      return years.length > 1
        ? `${yearText} W杯（いずれも決勝開催）`
        : `${yearText} W杯（決勝開催）`;
    }
    return `${yearText} W杯`;
  }

  const yearText = years.map((c) => `${c.year}`).join(', ');
  if (allFinal) {
    return years.length > 1
      ? `${yearText} World Cup (all hosted the final)`
      : `${yearText} World Cup (hosted the final)`;
  }
  return `${yearText} World Cup`;
}

/**
 * 会場のステージ別試合数を整形する。
 * ja: 「全6試合（グループリーグ 4・ラウンド32 1・決勝 1）」/ en: 「6 matches (Group stage 4, Round of 32 1, Final 1)」。
 * ステージ名はロケール辞書から引く。0 試合なら null。
 */
export function formatVenueStageSummary(
  summary: VenueMatchSummary,
  locale: Locale = 'ja',
): string | null {
  if (summary.total === 0) return null;
  const stageLabels = getDictionary(locale).match.stage;
  const parts = summary.byStage.map(
    (s) => `${stageLabels[s.stage as MatchStage] ?? s.stage} ${s.count}`,
  );
  if (locale === 'ja') {
    return `全${summary.total}試合（${parts.join('・')}）`;
  }
  return `${summary.total} matches (${parts.join(', ')})`;
}
