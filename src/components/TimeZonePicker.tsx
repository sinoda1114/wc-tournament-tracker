'use client';

import { useTransition } from 'react';
import { Button, Menu } from '@mantine/core';
import { useRouter } from 'next/navigation';

import { useTimeZone } from '@/lib/i18n/context';
import { COMMON_TIME_ZONES, TZ_COOKIE, tzCityLabel, tzOffset } from '@/lib/timezone';

const ONE_YEAR = 60 * 60 * 24 * 365;

/** wc_tz cookie に表示TZを保存する（コンポーネント外の副作用ヘルパー）。 */
function persistTimeZone(next: string): void {
  document.cookie = `${TZ_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/**
 * 表示タイムゾーンの手動切替（自動検出の上書き）。言語切替とは独立。
 * 選択を wc_tz cookie に保存し router.refresh() でサーバ再描画（時刻を選択TZで描き直す）。
 * トリガーには現在TZの短縮表記（JST/EDT…）を表示する。
 */
export function TimeZonePicker({ label }: { label: string }) {
  const router = useRouter();
  const current = useTimeZone();
  const [pending, startTransition] = useTransition();

  function choose(next: string) {
    if (next === current) return;
    persistTimeZone(next);
    startTransition(() => router.refresh());
  }

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Button
          variant="default"
          size="xs"
          radius="md"
          h={34}
          loading={pending}
          aria-label={label}
          title={`${label}: ${current}`}
          leftSection={<ClockIcon size={14} />}
        >
          {tzCityLabel(current).split(' / ')[0]}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {COMMON_TIME_ZONES.map((tz) => (
          <Menu.Item
            key={tz.value}
            onClick={() => choose(tz.value)}
            fw={tz.value === current ? 700 : 400}
            aria-current={tz.value === current ? 'true' : undefined}
          >
            {tz.label} ({tzOffset(tz.value)})
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

/** 時計アイコン。OS フォント非依存の SVG。 */
function ClockIcon({ size }: { size: number }) {
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
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
