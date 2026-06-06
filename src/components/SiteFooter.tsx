import Link from 'next/link';
import { Container } from '@mantine/core';

import styles from './SiteFooter.module.css';

/**
 * サイト共通フッタ。
 *
 * - 法務ページ（利用規約 / プライバシーポリシー / 特商法表記）への導線を集約する。
 * - FIFA 非公認の非公式ファンサイトである旨と、会場通称がスポンサー商標である旨を明記し、
 *   公式名称・公式ロゴの商標的使用を避ける（知財対策）。
 * - 配色は globals.css の --wc-* 変数を参照し、ダーク/ライト両テーマに追従する。
 *
 * 法的文面に関する注意:
 *   本コンポーネントおよびリンク先の法務ページは一般的な雛形であり、
 *   公開・課金開始前に必ず弁護士のレビューを受けること（断定的な法的助言ではない）。
 */
const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: '/terms', label: '利用規約' },
  { href: '/privacy', label: 'プライバシーポリシー' },
  { href: '/tokushoho', label: '特定商取引法に基づく表記' },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <Container size="xl" py="xl">
        <div className={styles.inner}>
          <div className={styles.top}>
            <div className={styles.brand}>
              <p className={styles.brandTitle}>WC 2026 決勝トーナメント トラッカー</p>
              <p className={styles.brandDesc}>
                2026年に開催される国際サッカー大会の試合日程・結果・出場国を、
                ファン向けに見やすくまとめる非公式の情報サイトです。
              </p>
            </div>

            <nav className={styles.nav} aria-label="フッターナビゲーション">
              {FOOTER_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={styles.navLink}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/*
            知財対策の中核となる表示。FIFA・各国サッカー協会・スポンサー等とは一切関係がないこと、
            公式名称/ロゴを権利者の許諾なく使用していないこと、会場の通称がスポンサー商標であることを明記する。
            「FIFAワールドカップ」等の正式名称はサービス名・見出しで商標的に用いない方針（本文では一般名称で説明する）。
          */}
          <p className={styles.disclaimer}>
            <strong>
              本サイトは FIFA 非公認の非公式ファンサイトです。
            </strong>{' '}
            FIFA（国際サッカー連盟）、各国・各地域のサッカー協会、大会の公式スポンサーその他の権利者とは、
            一切の提携・後援・推奨関係にありません。「FIFA」「ワールドカップ」その他の名称・エンブレム・公式ロゴは
            各権利者の商標であり、本サイトではこれらを権利者の商標として尊重し、公式ロゴ・エンブレムは使用していません。
            また、スタジアム等の会場名としてスポンサー企業名を冠した通称（ネーミングライツ名）が用いられる場合がありますが、
            これらの名称は各社の商標です。本サイトの情報は速報性・正確性を保証するものではありません。
          </p>

          <div className={styles.bottom}>
            <span>(c) {year} WC 2026 Tracker（非公式ファンサイト）</span>
            <span>掲載データは予告なく変更される場合があります。</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
