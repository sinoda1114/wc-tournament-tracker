'use client';

import type { MouseEvent } from 'react';

import { useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import { useDictionary } from '@/lib/i18n/context';

type FavoriteStarProps = {
  fifaCode: string;
  teamName?: string;
  size?: 'sm' | 'md';
};

const SIZE_PX: Record<NonNullable<FavoriteStarProps['size']>, number> = {
  sm: 14,
  md: 18,
};

/**
 * 滑らかな星アイコン用 SVG パス。
 * Unicode の ★/☆ は OS フォント依存で字形がカクつくため、24x24 の viewBox に描いた
 * 単一パスへ差し替えている。`fill` と `stroke` を切り替えるだけで塗り潰し/輪郭の
 * 2 状態を表現できる。
 */
const STAR_PATH =
  'M12 2.5l2.92 6.51 7.08.62-5.34 4.73 1.62 7.04L12 17.77l-6.28 3.63 1.62-7.04L2 9.63l7.08-.62L12 2.5z';

type StarIconProps = {
  size: number;
  filled: boolean;
};

function StarIcon({ size, filled }: StarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden
      focusable={false}
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

/**
 * お気に入りトグルボタン。
 *
 * - 親要素が `<Link>` の場合に伝播してしまうと意図せず詳細ページへ遷移するため、
 *   `stopPropagation` + `preventDefault` で必ず止める。
 * - 描画は塗り潰し（金色） / 輪郭（muted）の 2 状態 SVG。currentColor を使うため、
 *   ホバーやアクティブ色は CSS 側でまとめて制御している。
 */
export function FavoriteStar({ fifaCode, teamName, size = 'md' }: FavoriteStarProps) {
  const t = useDictionary().favoriteStar;
  const { isFavorite, toggle, ready } = useFavoriteTeams();
  const active = ready && isFavorite(fifaCode);
  const pixelSize = SIZE_PX[size];

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    toggle(fifaCode);
  };

  const labelTarget = teamName ?? fifaCode;
  const ariaLabel = (active ? t.removeAria : t.addAria).replace('{name}', labelTarget);

  return (
    <button
      type="button"
      className={`wc-favorite-star${active ? ' is-favorite' : ''}`}
      onClick={handleClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <StarIcon size={pixelSize} filled={active} />
    </button>
  );
}
