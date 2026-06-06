'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Popover } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import dayjs from 'dayjs';

import { formatMatchDate } from '@/lib/bracket';
import { addDays, parseDateParam, todayInZone } from '@/lib/date-filter';
import { useDictionary, useTimeZone } from '@/lib/i18n/context';

type QuickBadge = {
  key: 'all' | 'yesterday' | 'today' | 'tomorrow' | 'day-after-tomorrow';
  /** クリック時に設定する `?date` 値。null なら `?date` を消す。 */
  targetDate: string | null;
};

function buildBadges(anchors: {
  yesterday: string;
  today: string;
  tomorrow: string;
  dayAfterTomorrow: string;
} | null): QuickBadge[] {
  return [
    { key: 'all', targetDate: null },
    { key: 'yesterday', targetDate: anchors?.yesterday ?? null },
    { key: 'today', targetDate: anchors?.today ?? null },
    { key: 'tomorrow', targetDate: anchors?.tomorrow ?? null },
    { key: 'day-after-tomorrow', targetDate: anchors?.dayAfterTomorrow ?? null },
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
export function DateFilterBar({
  showQuickBadges = true,
}: {
  showQuickBadges?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const dict = useDictionary();
  const t = dict.dateFilter;
  const timeZone = useTimeZone();
  const badgeLabels: Record<QuickBadge['key'], string> = {
    all: t.all,
    yesterday: t.yesterday,
    today: t.today,
    tomorrow: t.tomorrow,
    'day-after-tomorrow': t.dayAfterTomorrow,
  };

  // SSR と CSR で "今日" がズレるとフリッカーするので mount 後にアンカー値を確定する。
  const [anchors, setAnchors] = useState<
    | {
        yesterday: string;
        today: string;
        tomorrow: string;
        dayAfterTomorrow: string;
      }
    | null
  >(null);

  useEffect(() => {
    const today = todayInZone(timeZone);
    setAnchors({
      yesterday: addDays(today, -1),
      today,
      tomorrow: addDays(today, 1),
      dayAfterTomorrow: addDays(today, 2),
    });
  }, [timeZone]);

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
    const today = todayInZone(timeZone);
    const target =
      badge.key === 'yesterday'
        ? addDays(today, -1)
        : badge.key === 'today'
          ? today
          : badge.key === 'tomorrow'
            ? addDays(today, 1)
            : addDays(today, 2);
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
    (!showQuickBadges ||
      !badges.some((b) => b.key !== 'all' && b.targetDate === activeDate))
      ? activeDate
      : null;

  const calendarValue: Date | null = activeDate
    ? dayjs(activeDate, 'YYYY-MM-DD').toDate()
    : null;

  return (
    <div className="wc-date-filter-bar" role="group" aria-label={t.groupAria}>
      {showQuickBadges ? (
        <div className="wc-date-filter-quick" role="tablist" aria-label={t.quickAria}>
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
                {badgeLabels[badge.key]}
              </button>
            );
          })}
        </div>
      ) : null}

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
              aria-label={t.openCalendar}
            >
              <span aria-hidden>📅</span>
              <span>{t.calendar}</span>
            </button>
          </Popover.Target>
          <Popover.Dropdown>
            <DatePicker value={calendarValue} onChange={handleCalendarChange} />
          </Popover.Dropdown>
        </Popover>

        {customActiveDate ? (
          <span className="wc-date-filter-active-chip" aria-live="polite">
            <span>{formatMatchDate(customActiveDate, dict.match.weekdays)}</span>
            <button
              type="button"
              className="wc-date-filter-reset"
              onClick={() => updateDate(null)}
              aria-label={t.reset}
            >
              ×
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}
