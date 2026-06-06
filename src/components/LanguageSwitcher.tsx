'use client';

import { useTransition } from 'react';
import { ActionIcon, Menu } from '@mantine/core';
import { useRouter } from 'next/navigation';

import { LOCALE_COOKIE, LOCALE_LABELS, LOCALES, type Locale } from '@/lib/i18n/config';

const ONE_YEAR = 60 * 60 * 24 * 365;

/** wc_locale cookie に選択ロケールを保存する（コンポーネント外の副作用ヘルパー）。 */
function persistLocale(next: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/**
 * 右上の言語スイッチャー（dep 無し・Cookie 方式）。
 * 選択を `wc_locale` cookie に保存し、router.refresh() でサーバ再レンダリング
 * （= cookie を読み直して新ロケールの辞書で描画）。ページ遷移はしない。
 */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    persistLocale(next);
    startTransition(() => router.refresh());
  }

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="default"
          size="lg"
          radius="md"
          aria-label={label}
          title={label}
          loading={pending}
        >
          <GlobeIcon size={16} />
        </ActionIcon>
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
