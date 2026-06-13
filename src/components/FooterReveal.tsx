'use client';

import { useState, type ReactNode } from 'react';
import { useMediaQuery } from '@mantine/hooks';

import styles from './SiteFooter.module.css';

/**
 * フッターを「隠しバー」化する（T-61・篠田フィードバック）。
 *
 * - デスクトップ（>=768px）: 従来どおりフッターを常時表示（children をそのまま描画）。
 * - モバイル（<768px）: 既定は折りたたみ、下部のハンドル（グラバー＋ラベル）をタップで展開。
 *   → 縦の専有面積を最小化しつつ、利用規約 / プライバシー / 特商法は「1 タップで必ず到達可能」
 *     なので法的な到達性は維持する（完全非表示=display:none にはしない方針）。
 *
 * SSR/ハイドレート:
 *   useMediaQuery は getInitialValueInEffect で初回 false（=デスクトップ）を返すため、
 *   SSR と初回クライアント描画は children をそのまま出す（DOM 一致）。マウント後の effect で
 *   モバイル判定が確定したらハンドル付きの折りたたみへ切り替える（HeaderControls と同方式）。
 *
 * NOTE: 「スワイプで引き出す」挙動は端末差・誤操作が多くアクセシビリティも落ちるため、
 *   見た目はプル系の“隠しバー”（グラバー）にしつつ、操作は確実なタップ開閉にしている。
 */
export function FooterReveal({ label, children }: { label: string; children: ReactNode }) {
  const isMobile = useMediaQuery('(max-width: 767px)', false, {
    getInitialValueInEffect: true,
  });
  const [open, setOpen] = useState(false);

  // デスクトップ（および判定確定前）は常時表示。
  if (isMobile !== true) return <>{children}</>;

  return (
    <div className={styles.reveal}>
      <button
        type="button"
        className={styles.revealHandle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="site-footer-content"
      >
        <span className={styles.revealGrabber} aria-hidden />
        <span className={styles.revealLabel}>{label}</span>
        <ChevronIcon open={open} />
      </button>
      <div id="site-footer-content" hidden={!open} className={styles.revealContent}>
        {children}
      </div>
    </div>
  );
}

/** 開閉を示すシェブロン（閉=上向き「引き出せる」/開=下向き「畳める」）。 */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`${styles.revealChevron}${open ? ` ${styles.revealChevronOpen}` : ''}`}
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
    >
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}
