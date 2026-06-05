/**
 * TheSportsDB の英語ポジション表記を GK/DF/MF/FW に分類し、日本語ラベルを提供する。
 *
 * TheSportsDB の `strPosition` は "Goalkeeper" / "Centre-Back" / "Defensive Midfield" /
 * "Centre-Forward" など多様。表示は 4 グループにまとめ、グループ内は元のポジションを
 * 日本語化して見せる。未知の表記は 'OTHER' に落とし、ラベルは原文をそのまま使う。
 */

export type PositionGroup = 'GK' | 'DF' | 'MF' | 'FW' | 'OTHER';

/** グループの表示順とヘッダーラベル（GK/DF/MF/FW の略号表記）。 */
export const POSITION_GROUPS: { group: PositionGroup; label: string }[] = [
  { group: 'GK', label: 'GK' },
  { group: 'DF', label: 'DF' },
  { group: 'MF', label: 'MF' },
  { group: 'FW', label: 'FW' },
  { group: 'OTHER', label: 'その他' },
];

export const POSITION_GROUP_ORDER: Record<PositionGroup, number> = {
  GK: 0,
  DF: 1,
  MF: 2,
  FW: 3,
  OTHER: 4,
};

/** 個別ポジション（英語 or GK/DF/MF/FW の略号）からグループを判定する。 */
export function classifyPosition(raw: string | null | undefined): PositionGroup {
  if (!raw) return 'OTHER';
  const p = raw.toLowerCase().trim();
  // Wikipedia スカッドの pos は GK/DF/MF/FW の略号。略号を直接判定する。
  if (p === 'gk') return 'GK';
  if (p === 'df') return 'DF';
  if (p === 'mf') return 'MF';
  if (p === 'fw') return 'FW';
  if (p.includes('keeper')) return 'GK';
  if (p.includes('back') || p.includes('defender') || p.includes('sweeper')) {
    return 'DF';
  }
  if (p.includes('midfield')) return 'MF';
  if (
    p.includes('forward') ||
    p.includes('striker') ||
    p.includes('winger') ||
    p.includes('attacker')
  ) {
    return 'FW';
  }
  return 'OTHER';
}
