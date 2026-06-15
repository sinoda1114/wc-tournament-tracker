'use client';

import { useEffect, useState } from 'react';
import { ActionIcon, Modal, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import { useDictionary } from '@/lib/i18n/context';

/**
 * スマホ「ホーム画面に追加」ボタン（PWA A2HS = Add To Home Screen）。
 *
 * 背景:
 *   iOS App Store / Google Play の審査が WC 開幕に間に合わないため、ネイティブアプリの
 *   代替として Web を「ホーム画面に追加」させる導線をヘッダ右上に置く。
 *
 * プラットフォーム分岐:
 *   - Android / Chromium 系: `beforeinstallprompt` を捕捉して既定挙動を抑止し、保存した
 *     event を使ってボタンクリックで `prompt()` を呼ぶ（ネイティブのインストール UI）。
 *     `appinstalled` でボタンを隠す。
 *   - iOS Safari: `beforeinstallprompt` 非対応。iOS かつ未インストール時はボタン押下で
 *     「共有ボタン → 『ホーム画面に追加』」の手順を Modal で案内する（SVG アイコン付き）。
 *   - 既にインストール済み（standalone 表示）の場合はボタンを一切表示しない。
 *
 * SSR 安全性:
 *   サーバー側 / ハイドレート直後は何も描画せず（mode='hidden'）、`useEffect`（クライアント
 *   のみ）で判定して初めて表示する。これで DOM 不一致と standalone 誤表示を避ける。
 *
 * NOTE: ThemeToggle と同じく ActionIcon + 24x24 viewBox の SVG で OS フォント依存を排除。
 *       配色はサイトのブランド（ブルー/濃紺）に合わせ、`--wc-accent` を使う。
 */

type Mode = 'hidden' | 'android' | 'ios';

/** standalone（= 既にホーム画面アプリとして起動中）かどうか。iOS の独自 API も見る。 */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const displayModeStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  // iOS Safari は navigator.standalone を持つ（型に無いので any 経由で安全に参照）。
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
}

/** iOS（iPhone / iPad / iPod）かどうかを UA とタッチ対応から判定する。 */
function isIos(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iosDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ は UA が Mac を名乗るため、タッチ点数で iPad を補足する。
  const iPadOs = ua.includes('Macintosh') && navigator.maxTouchPoints > 1;
  return iosDevice || iPadOs;
}

/** iOS 以外のモバイル（Android Chrome 等）か。デスクトップにはショートカット導線を出さない。 */
function isMobileNonIos(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|Mobi/i.test(window.navigator.userAgent);
}

export function AddToHomeScreen() {
  const t = useDictionary().addToHome;
  const [mode, setMode] = useState<Mode>('hidden');
  const [opened, modal] = useDisclosure(false);

  // ショートカット作成は「ブラウザのメニューから手動で行う」手順案内に統一する（T-67）。
  // ネイティブの install プロンプト（beforeinstallprompt→prompt）は使わない＝「アプリを
  // インストール」風の挙動・誤解を避け、ホーム画面に“素のショートカット”を作る導線にする。
  // （manifest も display:'browser' にして installable PWA 判定を外し、Chrome の ⋮ メニューに
  //  「ホーム画面に追加」が出るようにしている。）
  useEffect(() => {
    // 既にホーム画面から起動中なら出さない。
    if (isStandalone()) {
      setMode('hidden');
      return;
    }
    // iOS=Safari の共有メニュー手順 / それ以外のモバイル=Chrome 等の ⋮ メニュー手順。
    // デスクトップには出さない（スマホ向け導線のため）。
    if (isIos()) {
      setMode('ios');
    } else if (isMobileNonIos()) {
      setMode('android');
    } else {
      setMode('hidden');
    }
  }, []);

  if (mode === 'hidden') return null;

  const label = t.label;

  return (
    <>
      <Tooltip label={label}>
        <ActionIcon
          variant="default"
          size="lg"
          radius="md"
          onClick={modal.open}
          aria-label={label}
          aria-haspopup="dialog"
        >
          <InstallIcon size={16} />
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={opened}
        onClose={modal.close}
        title={label}
        centered
        radius="md"
        size="sm"
      >
        <Text size="sm" c="var(--wc-muted)" mb="md">
          {mode === 'ios' ? t.intro : t.androidIntro}
        </Text>
        <ol className="wc-a2hs-steps">
          {mode === 'ios' ? (
            <>
              <li className="wc-a2hs-step">
                <span className="wc-a2hs-step-icon" aria-hidden>
                  <ShareIcon size={20} />
                </span>
                <span>
                  {t.step1Before}
                  <Text component="span" fw={700} c="var(--wc-accent)">{t.shareButton}</Text>
                  {t.step1After}
                </span>
              </li>
              <li className="wc-a2hs-step">
                <span className="wc-a2hs-step-icon" aria-hidden>
                  <PlusSquareIcon size={20} />
                </span>
                <span>
                  {t.step2Before}
                  <Text component="span" fw={700} c="var(--wc-accent)">{t.addToHomeItem}</Text>
                  {t.step2After}
                </span>
              </li>
              <li className="wc-a2hs-step">
                <span className="wc-a2hs-step-icon" aria-hidden>
                  <CheckIcon size={20} />
                </span>
                <span>
                  {t.step3Before}
                  <Text component="span" fw={700} c="var(--wc-accent)">{t.addButton}</Text>
                  {t.step3After}
                </span>
              </li>
            </>
          ) : (
            <>
              <li className="wc-a2hs-step">
                <span className="wc-a2hs-step-icon" aria-hidden>
                  <MenuDotsIcon size={20} />
                </span>
                <span>{t.androidStep1}</span>
              </li>
              <li className="wc-a2hs-step">
                <span className="wc-a2hs-step-icon" aria-hidden>
                  <PlusSquareIcon size={20} />
                </span>
                <span>{t.androidStep2}</span>
              </li>
              <li className="wc-a2hs-step">
                <span className="wc-a2hs-step-icon" aria-hidden>
                  <CheckIcon size={20} />
                </span>
                <span>{t.androidStep3}</span>
              </li>
            </>
          )}
        </ol>
      </Modal>
    </>
  );
}

/**
 * ヘッダボタン用アイコン: 端末（スマートフォン）に「ショートカット（ホーム画面アイコン）を
 * 追加」するイメージ（スマホの図形＋プラス）。旧アイコン（下向き矢印＋トレイ）はファイル
 * ダウンロードに見え「インストール」と誤解されやすかったため、A2HS の意図（＝ホーム画面へ
 * ショートカット作成）が伝わる図柄へ差し替えた（T-60・6/11 の未マージ分を回収）。
 */
function InstallIcon({ size }: { size: number }) {
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
      {/* スマートフォン本体（角丸の縦長長方形） */}
      <rect x="5" y="2" width="14" height="20" rx="2.5" />
      {/* ホームインジケータ（下部の短い横線） */}
      <path d="M10 18.5h4" />
      {/* 追加を表すプラス記号（画面中央に配置） */}
      <path d="M12 8v5M9.5 10.5h5" />
    </svg>
  );
}

/** Android Chrome 等の「⋮（縦三点メニュー）」を表す SVG。 */
function MenuDotsIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden
      focusable={false}
    >
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

/** iOS の「共有」ボタンを表す SVG（上向き矢印＋ボックス）。 */
function ShareIcon({ size }: { size: number }) {
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
      <path d="M12 15V3" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </svg>
  );
}

/** 「ホーム画面に追加」項目を表す SVG（四角＋プラス）。 */
function PlusSquareIcon({ size }: { size: number }) {
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
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

/** 完了「追加」を表すチェック SVG。 */
function CheckIcon({ size }: { size: number }) {
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
      <path d="m4 12 5 5L20 6" />
    </svg>
  );
}
