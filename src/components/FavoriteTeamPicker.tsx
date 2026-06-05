'use client';

import { Text } from '@mantine/core';

import { TeamSearchCombobox } from '@/components/TeamSearchCombobox';
import type { Team } from '@/db/queries';
import { useFavoriteTeams } from '@/hooks/useFavoriteTeams';

type FavoriteTeamPickerProps = {
  teams: Team[];
};

/**
 * /favorites ページ用のお気に入りチーム選択コンボボックス。
 *
 * - 検索UIは共通の {@link TeamSearchCombobox} を使う。
 * - 選択（クリック / Enter）でお気に入りを toggle。連続操作できるよう閉じない。
 * - 登録済みは選択肢をアクティブ表示＋「✓ 登録済」バッジで明示。
 */
export function FavoriteTeamPicker({ teams }: FavoriteTeamPickerProps) {
  const { isFavorite, toggle, ready } = useFavoriteTeams();

  return (
    <TeamSearchCombobox
      className="wc-favorite-picker"
      teams={teams}
      ariaLabel="お気に入り国を検索"
      closeOnSelect={false}
      onSelect={(t) => toggle(t.fifaCode)}
      isOptionActive={(t) => ready && isFavorite(t.fifaCode)}
      optionAdornment={(t) =>
        ready && isFavorite(t.fifaCode) ? (
          <Text component="span" size="xs" c="yellow" fw={700} ml="auto" aria-label="登録済">
            ✓ 登録済
          </Text>
        ) : null
      }
    />
  );
}
