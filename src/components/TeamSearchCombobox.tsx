'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Combobox, Group, Input, Text, useCombobox } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { matchesTeamQuery } from '@/lib/team-search';

/** 検索に必要なチームの最小情報。 */
export type TeamSearchTeam = {
  id: string;
  nameJa: string;
  nameEn: string;
  fifaCode: string;
};

type TeamSearchComboboxProps = {
  teams: TeamSearchTeam[];
  /** 候補を選んだとき（クリック / Enter）に呼ばれる。 */
  onSelect: (team: TeamSearchTeam) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** 外側ラッパー div に付与するクラス（ページごとの幅調整用）。 */
  className?: string;
  /** ドロップダウン最大高さ(px)。既定 360。 */
  maxDropdownHeight?: number;
  /** 選択時にドロップダウンを閉じるか。既定 true（連続操作したい場合は false）。 */
  closeOnSelect?: boolean;
  /** 選択時に入力欄へ選んだ国名を表示するか。既定 false。 */
  fillInputOnSelect?: boolean;
  /** ユーザーが入力（タイプ）したときに呼ばれる。プログラムによる設定では呼ばれない。 */
  onQueryChange?: (query: string) => void;
  /** 選択肢をアクティブ表示にするか（例: お気に入り済み）。 */
  isOptionActive?: (team: TeamSearchTeam) => boolean;
  /** 各選択肢の末尾に表示する付加要素（例: 登録済バッジ）。 */
  optionAdornment?: (team: TeamSearchTeam) => ReactNode;
};

/**
 * 出場国検索コンボボックスの共通実装。/teams・/prediction・/favorites で共用する。
 *
 * - 並びは英語名アルファベット昇順（ここに集約）。
 * - 検索は日本語名 / 英語名 / FIFA コードの部分一致（{@link matchesTeamQuery}）。
 * - 選択肢は 旗・日本語名・英語名・FIFA コード（＋任意の付加要素）。
 * - 選択後の挙動（閉じる・入力反映）は props で切り替える。
 */
export function TeamSearchCombobox({
  teams,
  onSelect,
  placeholder = '日本 / Japan / JPN で検索',
  ariaLabel = '出場国を検索',
  className,
  maxDropdownHeight = 360,
  closeOnSelect = true,
  fillInputOnSelect = false,
  onQueryChange,
  isOptionActive,
  optionAdornment,
}: TeamSearchComboboxProps) {
  const [query, setQuery] = useState('');
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const sorted = useMemo(
    () => [...teams].sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en')),
    [teams],
  );
  const filtered = useMemo(
    () => sorted.filter((t) => matchesTeamQuery(t, query)),
    [sorted, query],
  );
  const byCode = useMemo(() => {
    const map = new Map<string, TeamSearchTeam>();
    for (const t of sorted) map.set(t.fifaCode, t);
    return map;
  }, [sorted]);

  return (
    <div className={className}>
      <Combobox
        store={combobox}
        withinPortal={false}
        onOptionSubmit={(value) => {
          const team = byCode.get(value);
          if (!team) return;
          onSelect(team);
          if (fillInputOnSelect) setQuery(team.nameJa);
          if (closeOnSelect) combobox.closeDropdown();
        }}
      >
        <Combobox.Target>
          <Input
            value={query}
            onChange={(event) => {
              const next = event.currentTarget.value;
              setQuery(next);
              onQueryChange?.(next);
              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
            }}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
            onClick={() => combobox.openDropdown()}
            placeholder={placeholder}
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            aria-label={ariaLabel}
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options mah={maxDropdownHeight} style={{ overflowY: 'auto' }}>
            {filtered.length > 0 ? (
              filtered.map((t) => (
                <Combobox.Option
                  value={t.fifaCode}
                  key={t.fifaCode}
                  active={isOptionActive?.(t)}
                >
                  <Group gap="xs" wrap="nowrap" align="center">
                    <CountryFlag fifaCode={t.fifaCode} size="sm" ariaLabel={t.nameJa} />
                    <Text component="span" fw={600} size="sm">
                      {t.nameJa}
                    </Text>
                    <Text component="span" size="xs" c="dimmed">
                      {t.nameEn}
                    </Text>
                    <Text
                      component="span"
                      size="xs"
                      c="dimmed"
                      ff="monospace"
                      style={{ letterSpacing: '0.04em' }}
                    >
                      {t.fifaCode}
                    </Text>
                    {optionAdornment?.(t)}
                  </Group>
                </Combobox.Option>
              ))
            ) : (
              <Combobox.Empty>該当する国はありません</Combobox.Empty>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </div>
  );
}
