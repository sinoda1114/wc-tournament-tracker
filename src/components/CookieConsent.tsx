'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@mantine/core';

import { readConsentAccepted, writeConsentAccepted } from '@/lib/consent';

import styles from './CookieConsent.module.css';

/**
 * Cookie / localStorage 利用同意バナー。
 *
 * 表示ロジック（hydration 安全）:
 *   - SSR と初回レンダリングでは必ず非表示（サーバー出力と一致させ、DOM 不一致を避ける）。
 *   - マウント後 useEffect で localStorage を読み、未同意のときだけ表示する。
 *   - 「同意する」で localStorage に記録し、以後は非表示。「閉じる（×）」はその場限りで隠す
 *     （= 同意は記録しないので次回アクセス時に再度出る。明示同意とドットの区別をつける）。
 *
 * 配色: ブルー/濃紺（CSS Modules 側で固定色）。Mantine の Button を流用。
 *
 * NOTE: 法的位置づけ（同意取得の要否・文面）は最終的に弁護士確認が必要。ここでは
 *   「端末内ストレージ（Cookie/localStorage）を使う」旨の周知を主目的とした一般的な実装にとどめる。
 */
export function CookieConsent() {
  // 初回は false 固定 → SSR と一致。マウント後に未同意なら true へ。
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readConsentAccepted()) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    writeConsentAccepted();
    setVisible(false);
  };

  // ×（閉じる）は同意を記録しない。次回も表示することで「黙って閉じた＝同意」にしない。
  const dismiss = () => {
    setVisible(false);
  };

  return (
    <div
      className={styles.banner}
      role="dialog"
      aria-label="Cookie・ストレージ利用への同意"
      aria-live="polite"
    >
      <div className={styles.inner}>
        <p className={styles.text}>
          本サイトでは、お気に入り登録や投票などの機能のために Cookie および
          ブラウザのローカルストレージを使用します。利用を続けることで、これらの使用に同意したものとみなされます。
          詳しくは{' '}
          <Link href="/privacy" className={styles.link}>
            プライバシーポリシー
          </Link>{' '}
          をご覧ください。
        </p>
        <div className={styles.actions}>
          <Button variant="subtle" color="gray" size="xs" onClick={dismiss}>
            閉じる
          </Button>
          <Button color="blue" size="xs" onClick={accept}>
            同意する
          </Button>
        </div>
      </div>
    </div>
  );
}
