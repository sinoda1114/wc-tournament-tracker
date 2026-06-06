'use client';

import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

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

// beforeinstallprompt は型定義が標準 lib に無い（実験的 API のため）。最小限を自前で定義する。
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

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

export function AddToHomeScreen() {
  const [mode, setMode] = useState<Mode>('hidden');
  const [iosOpened, iosModal] = useDisclosure(false);
  // Android のネイティブプロンプト event は再レンダーに依存しないので ref で保持する。
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 既にインストール済みなら何も出さない。
    if (isStandalone()) {
      setMode('hidden');
      return;
    }

    // iOS は beforeinstallprompt が来ないので、UA 判定で先に案内モードにする。
    if (isIos()) {
      setMode('ios');
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      // 既定のミニインフォバーを抑止し、自前ボタン経由で任意のタイミングに出す。
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setMode('android');
    };

    const handleAppInstalled = () => {
      // インストール完了したらボタンを隠し、保持していた event も破棄する。
      deferredPromptRef.current = null;
      setMode('hidden');
      iosModal.close();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
    // iosModal は @mantine/hooks が安定参照を返すため依存は初回のみで十分。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = async () => {
    if (mode === 'android') {
      const deferred = deferredPromptRef.current;
      if (!deferred) return;
      await deferred.prompt();
      const choice = await deferred.userChoice;
      // 一度使った prompt は再利用できない。承諾なら appinstalled で隠れるが、
      // 拒否時もここで破棄し、二重発火を防ぐ（ボタンは残し、再表示は次回 event 待ち）。
      deferredPromptRef.current = null;
      if (choice.outcome === 'accepted') {
        setMode('hidden');
      }
      return;
    }
    if (mode === 'ios') {
      iosModal.open();
    }
  };

  if (mode === 'hidden') return null;

  const label = 'ホーム画面に追加';

  return (
    <>
      <ActionIcon
        variant="default"
        size="lg"
        radius="md"
        onClick={handleClick}
        aria-label={label}
        title={label}
        aria-haspopup={mode === 'ios' ? 'dialog' : undefined}
      >
        <InstallIcon size={16} />
      </ActionIcon>

      {mode === 'ios' ? (
        <Modal
          opened={iosOpened}
          onClose={iosModal.close}
          title={label}
          centered
          radius="md"
          size="sm"
        >
          <Text size="sm" c="var(--wc-muted)" mb="md">
            このサイトをアプリのようにホーム画面へ追加できます。Safari の下記の手順で登録してください。
          </Text>
          <ol className="wc-a2hs-steps">
            <li className="wc-a2hs-step">
              <span className="wc-a2hs-step-icon" aria-hidden>
                <ShareIcon size={20} />
              </span>
              <span>
                画面下部の<Text component="span" fw={700} c="var(--wc-accent)"> 共有ボタン </Text>
                をタップします。
              </span>
            </li>
            <li className="wc-a2hs-step">
              <span className="wc-a2hs-step-icon" aria-hidden>
                <PlusSquareIcon size={20} />
              </span>
              <span>
                メニューを下にスクロールし
                <Text component="span" fw={700} c="var(--wc-accent)">「ホーム画面に追加」</Text>
                を選びます。
              </span>
            </li>
            <li className="wc-a2hs-step">
              <span className="wc-a2hs-step-icon" aria-hidden>
                <CheckIcon size={20} />
              </span>
              <span>
                右上の<Text component="span" fw={700} c="var(--wc-accent)">「追加」</Text>
                をタップして完了です。
              </span>
            </li>
          </ol>
        </Modal>
      ) : null}
    </>
  );
}

/** ヘッダボタン用アイコン: 端末にダウンロード/追加するイメージ（下向き矢印＋トレイ）。 */
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
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
