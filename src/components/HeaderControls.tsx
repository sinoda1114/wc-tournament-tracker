'use client';

import { type ReactNode } from 'react';
import { ActionIcon, Drawer, Group, Stack, Tooltip } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';

/**
 * ヘッダ右側の操作群（言語 / TZ / テーマ / DL / 管理リンク等）の配置を画面幅で切り替える。
 *
 * - デスクトップ（>=768px）: 従来どおり横並びで常時表示。
 * - モバイル（<768px）: バーガーボタン 1 つに集約し、押すと Drawer の中へ縦並びで出す。
 *   → ヘッダの占有面積（特に折返しによる縦伸び）を削減する（T-55）。
 *
 * 重要:
 * - children（= LanguageSwitcher / TimeZonePicker / AddToHomeScreen / ThemeToggle 等）は
 *   **片側にのみ**マウントする。両方に出すと AddToHomeScreen の `beforeinstallprompt`
 *   リスナが二重化したり、状態が分岐するため。useMediaQuery + マウント後判定で 1 系統に絞る。
 * - SSR/ハイドレート直後（isMobile が未確定）は Drawer 側に倒し、デスクトップで一瞬だけ
 *   バーガーが見える事故を避けるため、確定までは inline を描かない。
 * - Mantine compound（Drawer）は 'use client' 内に隔離（RSC undefined 罠の回避）。
 */
type HeaderControlsProps = {
  /** 低優先操作（言語/TZ/テーマ/DL）。モバイルでは Drawer 内、デスクトップでは inline。 */
  children: ReactNode;
  /** ログイン中ユーザーのアバター（UserButton）。常時 inline 表示で配置を維持。 */
  account?: ReactNode;
  /** 管理者向けの「管理画面」リンク（管理者のみ非 null）。 */
  adminLink?: ReactNode;
  /** バーガー/設定見出しのラベル（i18n）。 */
  menuLabel: string;
  settingsLabel: string;
};

export function HeaderControls({
  children,
  account,
  adminLink,
  menuLabel,
  settingsLabel,
}: HeaderControlsProps) {
  // getInitialValueInEffect: SSR と初回クライアント描画は initialValue(false) を返し、
  // マウント後（effect）に実際のメディアクエリ結果へ更新する。SSR は viewport を知り得ない
  // ため、サーバ HTML と初回クライアント描画を一致させてハイドレーション不一致を防ぐ。
  // 初期値を false（=デスクトップ）に倒すと、モバイルでは「一瞬 inline 表示→Drawer 集約」
  // に落ち着く（バーガーが先に出てから消える事故より無難）。
  const isMobile = useMediaQuery('(max-width: 767px)', false, {
    getInitialValueInEffect: true,
  });
  const [opened, drawer] = useDisclosure(false);

  const showMobile = isMobile === true;

  if (showMobile) {
    return (
      <Group gap="sm" align="center" wrap="nowrap">
        {account}
        <Tooltip label={menuLabel}>
          <ActionIcon
            variant="default"
            size="lg"
            radius="md"
            onClick={drawer.open}
            aria-label={menuLabel}
            aria-haspopup="dialog"
            aria-expanded={opened}
          >
            <BurgerIcon size={18} />
          </ActionIcon>
        </Tooltip>
        <Drawer
          opened={opened}
          onClose={drawer.close}
          position="right"
          size="xs"
          title={settingsLabel}
          radius="md"
          padding="lg"
        >
          <Stack gap="md">
            {adminLink ? <div onClick={drawer.close}>{adminLink}</div> : null}
            {/* 各操作は押下後に Drawer を閉じたいが、内部の Menu/Modal を壊さないため
                ラップ側ではクリックを横取りしない（操作完了は各コンポーネントに委譲）。 */}
            <Group gap="sm" align="center" wrap="wrap">
              {children}
            </Group>
          </Stack>
        </Drawer>
      </Group>
    );
  }

  // デスクトップ: 従来の横並び。
  return (
    <Group gap="sm" align="center" wrap="nowrap">
      {adminLink}
      {children}
      {account}
    </Group>
  );
}

/** バーガー（3 本線）アイコン。OS フォント非依存の SVG。 */
function BurgerIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
