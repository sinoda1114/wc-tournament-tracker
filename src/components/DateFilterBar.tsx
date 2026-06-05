'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Popover } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import dayjs from 'dayjs';

import { formatMatchDate } from '@/lib/bracket';
import {
  dayAfterTomorrowJst,
  parseDateParam,
  todayJst,
  tomorrowJst,
} from '@/lib/date-filter';

type QuickBadge = {
  key: 'all' | 'today' | 'tomorrow' | 'day-after-tomorrow';
  label: string;
  /** クリック時に設定する `?date` 値。null なら `?date` を消す。 */
  targetDate: string | null;
};

function buildBadges(anchors: {
  today: string;
  tomorrow: string;
  dayAfterTomorrow: string;
} | null): QuickBadge[] {
  return [
    { key: 'all', label: 'すべて', targetDate: null },
    { key: 'today', label: '今日', targetDate: anchors?.today ?? null },
    { key: 'tomorrow', label: '明日', targetDate: anchors?.tomorrow ?? null },
    {
      key: 'day-after-tomorrow',
      label: '明後日',
      targetDate: anchors?.dayAfterTomorrow ?? null,
    },
  ];
}

/**
 * グループリーグの日付フィルターバー。
 *
 * - 4 つのクイックバッジ（すべて / 今日 / 明日 / 明後日）
 * - 📅 ボタンで Popover を開いて `DatePicker` から任意日選択
 * - 選択中の日付が見えるバッジ群以外ならその日付を「6/12(金) ×」で表示
 *
 * 状態は URL クエリ `?date=YYYY-MM-DD` で表現する（共有可能、リロードで保持）。
 */
export function DateFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [popoverOpen, setPopoverOpen] = useState(false);

  // SSR と CSR で "今日" がズレるとフリッカーするので mount 後にアンカー値を確定する。
  const [anchors, setAnchors] = useState<
    | {
        today: string;
        tomorrow: string;
        dayAfterTomorrow: string;
      }
    | null
  >(null);

  useEffect(() => {
    const now = new Date();
    setAnchors({
      today: todayJst(now),
      tomorrow: tomorrowJst(now),
      dayAfterTomorrow: dayAfterTomorrowJst(now),
    });
  }, []);

  const dateParam = searchParams.get('date');
  const filter = parseDateParam(dateParam);
  const activeDate = filter.kind === 'date' ? filter.date : null;

  const badges = useMemo(() => buildBadges(anchors), [anchors]);

  const updateDate = (next: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set('date', next);
    } else {
      params.delete('date');
    }
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  };

  const handleBadgeClick = (badge: QuickBadge) => {
    // アンカー未確定（mount 前）はクリックしてもユーザの意図する日付を計算できないので、
    // クリック時に都度算出する。
    if (badge.key === 'all') {
      updateDate(null);
      return;
    }
    const now = new Date();
    const target =
      badge.key === 'today'
        ? todayJst(now)
        : badge.key === 'tomorrow'
          ? tomorrowJst(now)
          : dayAfterTomorrowJst(now);
    updateDate(target);
  };

  const handleCalendarChange = (value: Date | null) => {
    if (!value) {
      updateDate(null);
    } else {
      updateDate(dayjs(value).format('YYYY-MM-DD'));
    }
    setPopoverOpen(false);
  };

  const isBadgeActive = (badge: QuickBadge): boolean => {
    if (badge.key === 'all') return activeDate === null;
    if (!badge.targetDate) return false;
    return activeDate === badge.targetDate;
  };

  // アクティブな日付がクイックバッジに該当しない場合、独立した「pill + ×」を表示する。
  const customActiveDate =
    activeDate &&
    !badges.some((b) => b.key !== 'all' && b.targetDate === activeDate)
      ? activeDate
      : null;

  const calendarValue: Date | null = activeDate
    ? dayjs(activeDate, 'YYYY-MM-DD').toDate()
    : null;

  return (
    <div className="wc-date-filter-bar" role="group" aria-label="日付フィルター">
      <div className="wc-date-filter-quick" role="tablist" aria-label="クイック日付">
        {badges.map((badge) => {
          const active = isBadgeActive(badge);
          return (
            <button
              key={badge.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`wc-date-filter-badge${active ? ' is-on' : ''}`}
              onClick={() => handleBadgeClick(badge)}
            >
              {badge.label}
            </button>
          );
        })}
      </div>

      <div className="wc-date-filter-actions">
        <Popover
          opened={popoverOpen}
          onChange={setPopoverOpen}
          position="bottom-start"
          shadow="md"
          withinPortal
          trapFocus
        >
          <Popover.Target>
            <button
              type="button"
              className="wc-date-filter-calendar-button"
              onClick={() => setPopoverOpen((o) => !o)}
              aria-haspopup="dialog"
              aria-expanded={popoverOpen}
              aria-label="カレンダーから日付を選ぶ"
            >
              <span aria-hidden>📅</span>
              <span>カレンダー</span>
            </button>
          </Popover.Target>
          <Popover.Dropdown>
            <DatePicker value={calendarValue} onChange={handleCalendarChange} />
          </Popover.Dropdown>
        </Popover>

        {customActiveDate ? (
          <span className="wc-date-filter-active-chip" aria-live="polite">
            <span>{formatMatchDate(customActiveDate)}</span>
            <button
              type="button"
              className="wc-date-filter-reset"
              onClick={() => updateDate(null)}
              aria-label="日付フィルターを解除"
            >
              ×
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}
