import type { Metadata } from 'next';
import Link from 'next/link';

import styles from '../legal.module.css';

/*
 * 特定商取引法に基づく表記ページ ―― 現時点では「準備中の雛形（枠）」。
 *
 * 【重要】
 *   特商法に基づく表記は、有料サービス（買い切り課金等）を提供する事業者にとって
 *   法的に必須の表示です。本サービスは現時点で課金を導入していないため、ここでは
 *   項目の枠だけを用意し、各項目の値は「準備中」としています。
 *
 *   ▼ 課金実装時に必ず行うこと（このページの本記載）:
 *     - 運営者の氏名/名称・所在地・連絡先（電話番号・メールアドレス）
 *     - 販売価格、商品代金以外の必要料金（消費税・手数料等）
 *     - 支払方法・支払時期、役務（デジタルコンテンツ）の提供時期
 *     - 返品・キャンセル・解約に関する特約（デジタル商品の返金可否を含む）
 *     - 決済代行事業者名 等
 *   上記を確定のうえ、最終的に弁護士・税理士等の確認を得てから公開すること。
 *   （本コメントおよび本文は法的助言ではない。）
 */

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | WC 2026 トラッカー',
  description:
    'WC 2026 トラッカーの特定商取引法に基づく表記です（有料機能の提供開始にあわせて記載します）。',
  // 準備中ページのためインデックスさせない。課金実装で本記載にする際に robots 指定を見直すこと。
  robots: { index: false, follow: false },
};

/** 課金実装時に値を確定する項目。value=null は「準備中」表示にする。 */
const ITEMS: { label: string; value: string | null }[] = [
  { label: '販売事業者', value: null },
  { label: '運営統括責任者', value: null },
  { label: '所在地', value: null },
  { label: 'お問い合わせ先', value: null },
  { label: '販売価格', value: null },
  { label: '商品代金以外の必要料金', value: null },
  { label: '支払方法', value: null },
  { label: '支払時期', value: null },
  { label: '役務の提供時期', value: null },
  { label: '返品・キャンセル', value: null },
];

export default function TokushohoPage() {
  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <h1>特定商取引法に基づく表記</h1>
        <span className={styles.updated}>現在準備中</span>
      </header>

      <p className={styles.notice}>
        本ページは、有料機能（買い切り課金）の提供開始にあわせて記載する予定の<strong>準備中の枠</strong>です。
        現時点では本サービスに有料の販売はありません。課金導入時に、下記の各項目を法令に基づいて
        記載し、弁護士・税理士等の確認を得たうえで公開します。
      </p>

      <section className={styles.section}>
        <dl className={styles.defList}>
          {ITEMS.map((item) => (
            <div key={item.label} style={{ display: 'contents' }}>
              <dt>{item.label}</dt>
              <dd>
                {item.value ?? (
                  <span className={styles.placeholder}>準備中（課金開始時に記載）</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <Link href="/" className={styles.backLink}>
        ← トップへ戻る
      </Link>
    </article>
  );
}
