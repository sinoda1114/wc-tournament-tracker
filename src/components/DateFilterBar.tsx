'use client';

import { useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Popover } from '@mantine/core';
import { DatePicker } from '@mantine/dates';

import { formatMatchDate } from '@/lib/bracket';
import {
  addDays,
  parseDatesParam,
  parseQuickDayParam,
  serializeDatesParam,
  todayInZone,
  type QuickDayKey,
} from '@/lib/date-filter';
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

  // バッジ(?day=相対キー)とカレンダー(?date=絶対日付リスト)は別パラメータ・相互排他。
  // 同じパラメータを共有すると「カレンダーで明日に当たる日を選ぶとバッジが点灯する」
  // 干渉が起き、体験が壊れる（#37 フィードバック）。
  const urlDates = parseDatesParam(searchParams.get('date'));
  const activeQuickDay = parseQuickDayParam(searchParams.get('day'));
  // 連続クリック対策: router.push の反映（サーバー往復）を待つ間も最新の選択を
  // 即時反映するため楽観値を表示・計算の基準にする。
  const [activeDates, setOptimisticDates] = useOptimistic(urlDates);

  const badges = useMemo(() => buildBadges(anchors), [anchors]);

  /** カレンダー側の更新。?day はリセットする（相互排他）。 */
  const updateDates = (next: string[]) => {
    const normalized = parseDatesParam(next.join(','));
    const params = new URLSearchParams(searchParams.toString());
    const serialized = serializeDatesParam(normalized);
    if (serialized) {
      params.set('date', serialized);
    } else {
      params.delete('date');
    }
    params.delete('day');
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      setOptimisticDates(normalized);
      router.push(href, { scroll: false });
    });
  };

  /** バッジ側の更新。?date はリセットする（相互排他）。 */
  const updateQuickDay = (key: QuickDayKey | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key) {
      params.set('day', key);
    } else {
      params.delete('day');
    }
    params.delete('date');
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      setOptimisticDates([]);
      router.push(href, { scroll: false });
    });
  };

  const handleBadgeClick = (badge: QuickBadge) => {
    updateQuickDay(badge.key === 'all' ? null : badge.key);
  };

  // DatePicker(type="multiple") の値は string[](YYYY-MM-DD)。そのまま URL クエリに使える。
  // 複数日を選び続けられるよう、選択してもポップオーバーは閉じない（外側クリックで閉じる）。
  const handleCalendarChange = (value: string[]) => {
    updateDates(value);
  };

  const isBadgeActive = (badge: QuickBadge): boolean => {
    if (badge.key === 'all') return activeQuickDay === null && activeDates.length === 0;
    return activeQuickDay === badge.key;
  };

  // カレンダー選択は（バッジと独立に）常にチップ群で表示する。
  const chipDates = activeDates;

  const removeDate = (date: string) => {
    updateDates(activeDates.filter((d) => d !== date));
  };

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
            {/* 日曜始まり＋3文字曜日（Sun/Mon…）。日曜=赤(weekend既定)・土曜=青(CSS)。 */}
            <DatePicker
              type="multiple"
              value={activeDates}
              onChange={handleCalendarChange}
              highlightToday
              firstDayOfWeek={0}
              weekendDays={[0]}
              weekdayFormat="ddd"
              getDayProps={(date) => {
                if (new Date(date).getDay() === 6) {
                  return { className: 'wc-calendar-saturday' };
                }
                return {};
              }}
            />
          </Popover.Dropdown>
        </Popover>

        {chipDates.map((date) => (
          <span key={date} className="wc-date-filter-active-chip" aria-live="polite">
            <span>{formatMatchDate(date, dict.match.weekdays)}</span>
            <button
              type="button"
              className="wc-date-filter-reset"
              onClick={() => removeDate(date)}
              aria-label={t.reset}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
