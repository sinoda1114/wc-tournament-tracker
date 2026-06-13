'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Group } from '@mantine/core';

import { useFavoriteTeams } from '@/hooks/useFavoriteTeams';
import type { Dictionary } from '@/lib/i18n/dictionary';

type SiteNavProps = {
  labels: Dictionary['nav'];
  /**
   * グループステージ期間か（サーバーで isFreePeriod 判定して渡す）。
   * 期間中はトップ(/)がグループリーグ表示になるため、ナビのハイライトと
   * 「決勝T」のリンク先(/?view=kt)をフェーズに合わせて切り替える（#37）。
   */
  groupPhase: boolean;
};

const STAR_PATH =
  'M12 2.5l2.92 6.51 7.08.62-5.34 4.73 1.62 7.04L12 17.77l-6.28 3.63 1.62-7.04L2 9.63l7.08-.62L12 2.5z';

function NavStarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
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

function SiteNavInner({ labels, groupPhase }: SiteNavProps) {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const { favorites, ready } = useFavoriteTeams();
  const { isSignedIn } = useAuth();
  const isFavoritesActive = pathname.startsWith('/favorites');
  // 未ログイン時はローカルに残った旧データの件数を出さない（「ログイン前なのに★9」の
  // 違和感対策・#37 フィードバック）。データ自体は消さず、表示だけ抑制する。
  const favCount = ready && isSignedIn ? favorites.size : 0;
  const hasFavorites = favCount > 0;

  const isKtView = pathname === '/' && searchParams.get('view') === 'kt';

  // フェーズで「トップ(/)が何の画面か」が変わるため、ハイライトもそれに追従させる。
  const items = [
    {
      href: '/groups',
      key: 'groups' as const,
      active: pathname.startsWith('/groups') || (groupPhase && pathname === '/' && !isKtView),
    },
    {
      href: groupPhase ? '/?view=kt' : '/',
      key: 'knockout' as const,
      active:
        pathname.startsWith('/matches') || (pathname === '/' && (groupPhase ? isKtView : true)),
    },
    { href: '/teams', key: 'teams' as const, active: pathname.startsWith('/teams') },
    {
      href: '/prediction',
      key: 'prediction' as const,
      active: pathname.startsWith('/prediction'),
    },
    {
      href: '/rankings',
      key: 'rankings' as const,
      active: pathname.startsWith('/rankings'),
    },
  ];

  return (
    <Group gap="xs" className="wc-site-nav" role="navigation" aria-label={labels.label}>
      {/* お気に入り(⭐)は最左に固定する（PC・モバイル共通）。本サービスのコンセプト＝
          ファボ重視＝視線/親指が最初に届く左端へ（篠田 2026-06-13: PC も左で確定）。 */}
      <Link
        href="/favorites"
        className={`wc-nav-link wc-nav-favorites${isFavoritesActive ? ' is-active' : ''}${hasFavorites ? ' has-favorites' : ''}`}
        aria-current={isFavoritesActive ? 'page' : undefined}
        aria-label={hasFavorites ? `${labels.favorites} (${favCount})` : labels.favorites}
        title={labels.favorites}
      >
        <NavStarIcon filled={hasFavorites} />
        {hasFavorites ? (
          <span className="wc-nav-link-count" aria-hidden>
            {favCount}
          </span>
        ) : null}
      </Link>

      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`wc-nav-link${item.active ? ' is-active' : ''}`}
          aria-current={item.active ? 'page' : undefined}
        >
          {labels[item.key]}
        </Link>
      ))}
    </Group>
  );
}

export function SiteNav(props: SiteNavProps) {
  // useSearchParams は Suspense 境界が必要（Next.js の CSR bailout 対策）。
  return (
    <Suspense fallback={null}>
      <SiteNavInner {...props} />
    </Suspense>
  );
}
