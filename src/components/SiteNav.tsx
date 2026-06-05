'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Group } from '@mantine/core';

import { useFavoriteTeams } from '@/hooks/useFavoriteTeams';

type NavLink = {
  href: string;
  label: string;
  /** 完全一致でなくこのプレフィックスならアクティブとみなす場合に使う。 */
  match?: (pathname: string) => boolean;
};

const NAV_LINKS: NavLink[] = [
  {
    href: '/groups',
    label: 'グループリーグ',
    match: (pathname) => pathname.startsWith('/groups'),
  },
  {
    href: '/',
    label: '決勝T',
    match: (pathname) => pathname === '/' || pathname.startsWith('/matches'),
  },
  {
    href: '/teams',
    label: '出場国',
    match: (pathname) => pathname.startsWith('/teams'),
  },
  {
    href: '/prediction',
    label: '優勝予想',
    match: (pathname) => pathname.startsWith('/prediction'),
  },
];

const STAR_PATH =
  'M12 2.5l2.92 6.51 7.08.62-5.34 4.73 1.62 7.04L12 17.77l-6.28 3.63 1.62-7.04L2 9.63l7.08-.62L12 2.5z';

function NavStarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
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

export function SiteNav() {
  const pathname = usePathname() ?? '/';
  const { favorites, ready } = useFavoriteTeams();
  const isFavoritesActive = pathname.startsWith('/favorites');
  const favCount = ready ? favorites.size : 0;
  const hasFavorites = favCount > 0;

  return (
    <Group gap="xs" className="wc-site-nav" role="navigation" aria-label="主要ページ">
      {NAV_LINKS.map((link) => {
        const isActive = link.match
          ? link.match(pathname)
          : pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`wc-nav-link${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}

      <Link
        href="/favorites"
        className={`wc-nav-link wc-nav-favorites${isFavoritesActive ? ' is-active' : ''}${hasFavorites ? ' has-favorites' : ''}`}
        aria-current={isFavoritesActive ? 'page' : undefined}
        aria-label={hasFavorites ? `お気に入り (${favCount}件)` : 'お気に入り'}
        title="お気に入り"
      >
        <NavStarIcon filled={hasFavorites} />
        {hasFavorites ? (
          <span className="wc-nav-link-count" aria-hidden>
            {favCount}
          </span>
        ) : null}
      </Link>
    </Group>
  );
}
