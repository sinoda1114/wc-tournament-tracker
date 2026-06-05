/**
 * 会場情報カードの表示整形ユーティリティ（純粋関数のみ）。
 *
 * DB から来る生の値（収容人数・屋根タイプ・標高・過去W杯・ステージ集計）を
 * 日本語の表示文字列へ変換する。UI から計算ロジックを分離してテスト可能にする。
 */

import type {
  VenueMatchSummary,
  VenuePastWorldCup,
  VenueRoofType,
} from '@/db/queries';
import { STAGE_LABELS, type MatchStage } from '@/lib/bracket';

/** この高度(m)以上を「高地」として強調する。 */
export const HIGH_ALTITUDE_THRESHOLD_M = 1500;

export function formatCapacity(capacity: number | null): string | null {
  if (capacity === null || !Number.isFinite(capacity)) return null;
  return capacity.toLocaleString('en-US');
}

export function roofTypeLabel(roofType: VenueRoofType | null): string | null {
  switch (roofType) {
    case 'retractable':
      return '開閉式屋根（空調あり）';
    case 'translucent':
      return '半屋根（屋外・空調なし）';
    case 'open':
      return '屋外';
    default:
      return null;
  }
}

/**
 * 2026 は全会場が天然芝（ハイブリッド）。屋内（開閉式屋根）会場のみ「屋内設置」を補足する。
 */
export function surfaceLabel(roofType: VenueRoofType | null): string {
  if (roofType === 'retractable') {
    return '天然芝（ハイブリッド・屋内設置）';
  }
  return '天然芝（ハイブリッド）';
}

export function isHighAltitude(elevationM: number | null): boolean {
  return elevationM !== null && elevationM >= HIGH_ALTITUDE_THRESHOLD_M;
}

export function formatElevation(elevationM: number | null): string | null {
  if (elevationM === null || !Number.isFinite(elevationM)) return null;
  return `標高 ${elevationM.toLocaleString('en-US')}m`;
}

/**
 * 過去W杯開催歴を「1970年・1986年 W杯（いずれも決勝開催）」のように整形する。
 * 全開催年が決勝開催なら決勝の注記を付す。空配列は null。
 */
export function formatPastWorldCups(
  cups: VenuePastWorldCup[],
): string | null {
  if (cups.length === 0) return null;
  const years = [...cups].sort((a, b) => a.year - b.year);
  const yearText = years.map((c) => `${c.year}年`).join('・');
  const allFinal = years.every((c) => c.final);
  if (allFinal) {
    return years.length > 1
      ? `${yearText} W杯（いずれも決勝開催）`
      : `${yearText} W杯（決勝開催）`;
  }
  return `${yearText} W杯`;
}

/**
 * 会場のステージ別試合数を「全6試合（グループリーグ 4・ラウンド32 1・決勝 1）」へ整形する。
 * 0 試合なら null。
 */
export function formatVenueStageSummary(
  summary: VenueMatchSummary,
): string | null {
  if (summary.total === 0) return null;
  const parts = summary.byStage.map(
    (s) => `${STAGE_LABELS[s.stage as MatchStage] ?? s.stage} ${s.count}`,
  );
  return `全${summary.total}試合（${parts.join('・')}）`;
}
