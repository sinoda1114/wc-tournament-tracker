import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { Container } from '@mantine/core';

import type { Dictionary } from '@/lib/i18n/dictionary';

import styles from './SiteFooter.module.css';

/**
 * サイト共通フッタ（コンパクト版）。
 *
 * - 上部はサービス名のみ。
 * - 最下部は「法務リンク（利用規約 / プライバシー / 特商法）＋ コピーライト＋データ注記」を
 *   中黒区切りの 1 行にまとめる（横並び・狭幅では折り返し）。
 * - FIFA 非公認・商標の全文表記は利用規約ページに記載するため footer では持たない
 *   （公開・課金前に弁護士レビューを受けること）。
 */
const FOOTER_LINKS: { href: string; key: 'linkTerms' | 'linkPrivacy' | 'linkTokushoho' }[] = [
  { href: '/terms', key: 'linkTerms' },
  { href: '/privacy', key: 'linkPrivacy' },
  { href: '/tokushoho', key: 'linkTokushoho' },
];

export function SiteFooter({ t }: { t: Dictionary['footer'] }) {
  const leftItems: { key: string; node: ReactNode }[] = [
    ...FOOTER_LINKS.map((link) => ({
      key: link.href,
      node: (
        <Link href={link.href} className={styles.navLink}>
          {t[link.key]}
        </Link>
      ),
    })),
    { key: 'notice', node: <span>{t.dataNotice}</span> },
  ];

  return (
    <footer className={styles.footer}>
      <Container size="xl" py="md">
        <div className={styles.inner}>
          <p className={styles.brandTitle}>{t.brandTitle}</p>

          <div className={styles.bottom}>
            <div className={styles.left}>
              {leftItems.map((item, index) => (
                <Fragment key={item.key}>
                  {index > 0 ? (
                    <span aria-hidden className={styles.sep}>
                      ·
                    </span>
                  ) : null}
                  {item.node}
                </Fragment>
              ))}
            </div>
            <p className={styles.copyright}>{t.copyright}</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
