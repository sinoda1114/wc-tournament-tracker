'use client';

import { Badge } from '@mantine/core';

import { useDictionary } from '@/lib/i18n/context';
import type { MatchDataState } from '@/lib/match-data-state';

type MatchDataBadgeProps = {
  state: MatchDataState;
  size?: string;
};

/**
 * 「データの正直さ」バッジ（T-82④）。
 * - pending（データ確認中）: 終了しているはずが未確定＝結果が未取込/確認中。
 * - provisional（速報）: 終了済みだが得点者が不足＝中途半端なデータ。
 * confirmed のときは何も描画しない（確定値はバッジ無しで通常表示）。
 *
 * 確定値と視覚的に区別するため色を分ける（pending=orange / provisional=blue）。
 */
export function MatchDataBadge({ state, size = 'sm' }: MatchDataBadgeProps) {
  const dict = useDictionary();
  if (state === 'confirmed') return null;

  const label =
    state === 'pending' ? dict.match.dataState.pending : dict.match.dataState.provisional;
  const color = state === 'pending' ? 'orange' : 'blue';

  return (
    <Badge variant="light" size={size} color={color}>
      {label}
    </Badge>
  );
}
