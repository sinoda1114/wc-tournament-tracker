'use client';

import { useTransition } from 'react';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';

import { localePath } from '@/lib/i18n/alternates';
import { isLocale, LOCALE_COOKIE, LOCALE_LABELS, LOCALES, type Locale } from '@/lib/i18n/config';

const ONE_YEAR = 60 * 60 * 24 * 365;

/** wc_locale cookie に選択ロケールを保存する（コンポーネント外の副作用ヘルパー）。 */
function persistLocale(next: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/**
 * 現在パスが公開トップ（`/` または `/en` 等）かを判定する。
 * トップはロケール別URLを持つ（#19）ため、言語切替で **URL 遷移**する。
 */
function isHomePath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return true; // '/'
  return segments.length === 1 && isLocale(segments[0]) && segments[0] !== 'ja'; // '/en' 等
}

/**
 * 右上の言語スイッチャー（dep 無し）。
 * - 公開トップ上: 選択ロケールの **URL へ遷移**（`router.push`）＋ cookie 保存（#19）。
 * - それ以外（内部ページ）: cookie 保存＋ `router.refresh()`（URL 変種が無いため従来通り）。
 */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    persistLocale(next);
    if (isHomePath(pathname)) {
      startTransition(() => router.push(localePath('home', next)));
    } else {
      startTransition(() => router.refresh());
    }
  }

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Tooltip label={label}>
          <ActionIcon
            variant="default"
            size="lg"
            radius="md"
            aria-label={label}
            loading={pending}
          >
            <GlobeIcon size={16} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        {LOCALES.map((l) => (
          <Menu.Item
            key={l}
            onClick={() => choose(l)}
            fw={l === locale ? 700 : 400}
            aria-current={l === locale ? 'true' : undefined}
          >
            {LOCALE_LABELS[l]}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

/** 言語（地球儀）アイコン。OS フォント非依存の SVG。 */
function GlobeIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
    </svg>
  );
}
