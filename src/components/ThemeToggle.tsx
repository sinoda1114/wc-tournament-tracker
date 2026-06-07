'use client';

import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';

import { useDictionary } from '@/lib/i18n/context';

type ThemeToggleProps = {
  size?: number;
};

/**
 * ライト/ダーク切替ボタン。
 *
 * - Mantine の color scheme をネイティブに切り替える（localStorage へ自動永続化）。
 * - SSR/hydrate 前のちらつきは layout の `ColorSchemeScript` が抑止する。
 *   このボタン自身は `getInitialValueInEffect` でマウント後に実値を反映し、DOM 不一致を避ける。
 * - アイコンは OS フォント依存を避けるため絵文字でなく 24x24 viewBox の SVG で固定（MapIcon と同方針）。
 *
 * NOTE: カスタム CSS 変数（`globals.css` の `--wc-*`）のライト用パレットは別担当（SUB-B）。
 * それが入るまでライト表示はカスタム背景/枠が暗いままになる点に留意。
 */
export function ThemeToggle({ size = 16 }: ThemeToggleProps) {
  const t = useDictionary().theme;
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('dark', { getInitialValueInEffect: true });
  const isDark = computed === 'dark';
  const next = isDark ? 'light' : 'dark';
  const label = isDark ? t.switchToLight : t.switchToDark;

  return (
    <ActionIcon
      variant="default"
      size="lg"
      radius="md"
      onClick={() => setColorScheme(next)}
      aria-label={label}
      title={label}
    >
      {isDark ? <SunIcon size={size} /> : <MoonIcon size={size} />}
    </ActionIcon>
  );
}

function SunIcon({ size }: { size: number }) {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ size }: { size: number }) {
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}
