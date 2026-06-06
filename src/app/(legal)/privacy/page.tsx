import type { Metadata } from 'next';
import Link from 'next/link';

import styles from '../legal.module.css';

/*
 * プライバシーポリシーページ。
 *
 * 【重要・法的免責】
 *   本文面は本サービスの実態に沿って作成した「一般的な雛形」であり、法的助言ではありません。
 *   実際に取得する情報・委託先（決済代行・認証基盤・ホスティング・解析等）が確定した段階で、
 *   必ず弁護士のレビューを受けて確定させてください。とくに以下は導入時に追記が必要です:
 *     - 認証基盤（ログイン）導入時: 取得する識別子・メールアドレス等と第三者提供/委託の記載
 *     - 決済導入時: 決済代行事業者への情報提供、保持期間
 *     - アクセス解析導入時: 利用ツール・Cookie・オプトアウト方法
 *
 * 実態の前提（2026-06 時点）:
 *   - お気に入り（localStorage）・投票（多重投票防止のための匿名 cookie）のみ。
 *   - サーバーには個人を特定する情報を保存していない。
 */

export const metadata: Metadata = {
  title: 'プライバシーポリシー | WC 2026 トラッカー',
  description: 'WC 2026 トラッカー（非公式ファンサイト）のプライバシーポリシーです。',
};

const UPDATED = '2026年6月6日';

export default function PrivacyPage() {
  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <h1>プライバシーポリシー</h1>
        <span className={styles.updated}>最終改定日: {UPDATED}</span>
      </header>

      <p className={styles.notice}>
        本ポリシーは一般的な雛形をもとにした暫定版です。ログイン機能・決済・アクセス解析などの
        導入にあわせて、取得情報や外部委託先の記載を追記・確定します。
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. 基本方針</h2>
        <p className={styles.body}>
          当サイト（以下「本サービス」）は、利用者のプライバシーを尊重し、個人情報の適切な
          取り扱いに努めます。本サービスは2026年の国際的なサッカー大会に関する情報を提供する
          非公式ファンサイトであり、現時点では利用者個人を特定する情報をサーバー上に保存していません。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. 取得する情報</h2>
        <ul className={styles.list}>
          <li>
            <strong>端末内に保存される情報（Cookie・ローカルストレージ）:</strong>{' '}
            お気に入りに登録したチーム、表示設定（テーマ等）、同意状態などを、利用者の
            ブラウザのローカルストレージに保存します。これらは利用者の端末内に保存され、
            原則としてサーバーへ送信されません。
          </li>
          <li>
            <strong>投票に関する匿名識別子:</strong>{' '}
            予想投票機能では、同一利用者による多重投票を防ぐ目的で、匿名の識別子（Cookie）を
            使用します。この識別子から個人を特定することはできません。
          </li>
          <li>
            <strong>アクセスに関する技術情報:</strong>{' '}
            サービスの安定運用とセキュリティのため、サーバーやホスティング事業者において、
            アクセス日時・IP アドレス・ブラウザ情報などの技術的な情報が一時的に記録される
            場合があります。
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. 利用目的</h2>
        <ul className={styles.list}>
          <li>お気に入り・表示設定など、利用者の利便性を高める機能の提供のため。</li>
          <li>予想投票の集計と、不正・多重投票の防止のため。</li>
          <li>本サービスの安定的な運用、品質改善、不正アクセス対策のため。</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. 外部サービス・データの取得元</h2>
        <p className={styles.body}>
          本サービスの試合データ等は、外部の公開データソースから取得して表示しています。
          また、本サービスはホスティング事業者のインフラ上で提供されます。これらの事業者に
          おける情報の取り扱いは、各事業者の定めによります。将来、ログイン認証・決済・
          アクセス解析等の外部サービスを導入する場合は、その提供事業者と提供する情報の範囲を
          本ポリシーに明記します。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Cookie・ローカルストレージの管理</h2>
        <p className={styles.body}>
          利用者は、ブラウザの設定により Cookie の受け入れを拒否したり、保存済みの Cookie・
          ローカルストレージを削除したりできます。ただし、これらを無効化・削除した場合、
          お気に入りや表示設定が保持されないなど、本サービスの一部機能が正常に動作しないことが
          あります。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. 第三者への提供</h2>
        <p className={styles.body}>
          運営者は、法令に基づく場合を除き、利用者の個人情報を本人の同意なく第三者に提供しません。
          サービス提供に必要な範囲で外部事業者に処理を委託する場合は、適切な監督を行います。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. 将来のアカウント・決済機能について</h2>
        <p className={`${styles.body} ${styles.muted}`}>
          本サービスは将来、ログインによる利用者登録および買い切り型の有料機能の提供を予定して
          います。これらを導入する際には、取得する情報（識別子・メールアドレス・決済に関する情報
          など）、その利用目的、決済代行事業者等への提供について、本ポリシーを改定して明記します。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>8. お問い合わせ・改定</h2>
        <p className={`${styles.body} ${styles.muted}`}>
          本ポリシーに関するお問い合わせ窓口、および運営者情報は、サービスの正式公開時に
          <Link href="/tokushoho">特定商取引法に基づく表記</Link>等とあわせて記載します。
          本ポリシーは、必要に応じて改定されることがあります。
        </p>
      </section>

      <Link href="/" className={styles.backLink}>
        ← トップへ戻る
      </Link>
    </article>
  );
}
