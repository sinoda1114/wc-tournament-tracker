import type { Metadata } from 'next';
import Link from 'next/link';

import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

import { LegalItemsArticle } from '../legalShared';
import styles from '../legal.module.css';
import { TOKUSHOHO_CONTENT } from './content';

/*
 * 特定商取引法に基づく表記ページ（清書版・弁護士レビュー前ドラフト完成版）。
 *
 * 【法的免責】
 *   本文面はドラフトであり、法的助言ではありません。公開前に弁護士レビューを受けること。
 *
 * 【方針】
 *   - 事業者は個人。氏名・住所・電話番号はソースコード/サイトに記載せず、
 *     「請求があったら遅滞なく開示する」方式（消費者庁ガイドラインで個人事業者に
 *     認められる省略形）を採用。
 *
 * 【未確定事項】
 *   - 販売価格は購入手続き画面（Stripe Checkout）に表示する方式。決済導線の実装は #14。
 *   - robots noindex は正式な販売開始（#14）時に解除を検討すること。
 */

// T-19: metadata はロケール対応（本文の多言語化は別タスク）。noindex は維持（#14 で解除検討）。
export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = getDictionary(await resolveLocale()).meta.tokushoho;
  return {
    title,
    description,
    // 販売開始前のため暫定で noindex。正式な販売開始（#14）時に解除を検討。
    robots: { index: false, follow: false },
  };
}

const UPDATED = '2026年6月10日';

/** 特商法の表示項目。販売価格は購入手続き画面（Stripe Checkout）に表示する方式（#14）。 */
const ITEMS: { label: string; value: React.ReactNode }[] = [
  {
    label: '販売事業者',
    value:
      '個人事業者のため、特定商取引法に基づく氏名等の開示は、請求があった場合に遅滞なく電子メール等により開示します。開示をご希望の方は下記お問い合わせ先までご請求ください。',
  },
  {
    label: '所在地',
    value: '請求があった場合に遅滞なく開示します（上記「販売事業者」参照）。',
  },
  {
    label: '電話番号',
    value:
      '請求があった場合に遅滞なく開示します。お問い合わせは原則として下記メールにて受け付けます。',
  },
  {
    label: 'お問い合わせ先（メール）',
    value: <strong>info@matchfav.com</strong>,
  },
  {
    label: '販売価格',
    value:
      '各プランの購入手続き画面に表示します（買い切り・税込価格。月額等の継続課金ではありません）。',
  },
  {
    label: '商品代金以外の必要料金',
    value:
      'なし。ただし、本サービスの利用に必要なインターネット接続料金・通信料金は利用者の負担となります。',
  },
  {
    label: '支払方法',
    value: 'クレジットカード決済',
  },
  {
    label: '支払時期',
    value: '購入手続き時に即時決済されます。',
  },
  {
    label: '役務の提供時期',
    value:
      '決済完了後、ただちに全機能をご利用いただけます。提供期間は 2026年9月30日（予定・変更時はサイト上で事前告知）までです。本サービスは大会に関連した期間限定サービスであり、買い切り料金は同日までの利用権の対価です。なお、グループステージ期間（2026年6月29日 0:00 日本時間／2026年6月28日 15:00 UTC まで）は無料でご利用いただけます。同時刻（決勝トーナメント期間の開始）以降に新規登録された場合は、登録から72時間無料でご利用いただけます。',
  },
  {
    label: '返品・キャンセル（返金方針）',
    value:
      'デジタルコンテンツという商品の性質上、決済完了後の利用者都合による返品・キャンセル・返金には原則として応じられません。購入前に無料期間（グループステージ期間、または決勝トーナメント以降の新規登録から72時間）で内容をご確認ください。当方の責に帰すべき事由によりサービスが相当期間利用できなかった場合や二重決済が生じた場合は、上記お問い合わせ先までご連絡ください。個別に対応します。',
  },
  {
    label: '動作環境',
    value: '最新版の Google Chrome を推奨します。',
  },
];

export default async function TokushohoPage() {
  // 日本語は正本（下記JSX）をそのまま。en/es/pt/zh は参考訳コンテンツを描画（T-114）。
  const locale = await resolveLocale();
  if (locale !== 'ja') {
    return <LegalItemsArticle doc={TOKUSHOHO_CONTENT[locale]} />;
  }
  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <h1>特定商取引法に基づく表記</h1>
        <span className={styles.updated}>最終改定日: {UPDATED}</span>
      </header>

      <section className={styles.section}>
        <dl className={styles.defList}>
          {ITEMS.map((item) => (
            <div key={item.label} style={{ display: 'contents' }}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className={`${styles.body} ${styles.muted}`}>
        関連ページ: <Link href="/terms">利用規約</Link> /{' '}
        <Link href="/privacy">プライバシーポリシー</Link>
      </p>

      <Link href="/" className={styles.backLink}>
        ← トップへ戻る
      </Link>
    </article>
  );
}
