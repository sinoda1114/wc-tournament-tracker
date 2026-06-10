import type { Metadata } from 'next';
import Link from 'next/link';

import styles from '../legal.module.css';

/*
 * プライバシーポリシーページ（清書版・弁護士レビュー前ドラフト完成版）。
 *
 * 【法的免責】
 *   本文面はサービス実態（Clerk 認証・Stripe 決済・Turso DB・TheSportsDB / WeatherAPI）に
 *   沿って作成したドラフトであり、法的助言ではありません。公開前に弁護士レビューを受けること。
 *
 * 【プレースホルダ】
 *   - info@matchfav.com … 事業用メールアドレス確定後に置換
 *   - matchfav.com       … タスク #22 確定後に置換
 */

export const metadata: Metadata = {
  title: 'プライバシーポリシー | MatchFav',
  description:
    'MatchFav（FIFA非公認の非公式ファンサイト）のプライバシーポリシーです。',
};

const UPDATED = '2026年6月10日';

export default function PrivacyPage() {
  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <h1>プライバシーポリシー</h1>
        <span className={styles.updated}>最終改定日: {UPDATED}</span>
      </header>

      <p className={styles.notice}>
        本ポリシー中の <strong>info@matchfav.commatchfav.com</strong>{' '}
        は、連絡先・独自ドメイン（#22）の確定後に置き換えられる暫定表記です。
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. 基本方針</h2>
        <p className={styles.body}>
          運営者（以下「当方」）は、当方が提供するウェブサービス「MatchFav（マッチファボ）」
          （<strong>matchfav.com</strong>。以下「本サービス」）における利用者の個人情報を、
          個人情報の保護に関する法律その他の関係法令を遵守し、適切に取り扱います。
          本サービスは FIFA 非公認の非公式ファンサイトです。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. 取得する情報</h2>
        <ul className={styles.list}>
          <li>
            <strong>アカウント情報:</strong> 本サービスのログインには認証基盤 Clerk
            （Clerk, Inc.）を利用しており、Google アカウント等によるログイン時に、
            メールアドレス、氏名・表示名、プロフィール画像などの Google プロフィール情報を
            取得します。パスワードを当方が保持することはありません。
          </li>
          <li>
            <strong>決済情報:</strong> 有料サービスの決済は決済代行事業者 Stripe
            （Stripe, Inc.）を通じて行われます。クレジットカード番号等のカード情報は
            Stripe が直接取り扱い、<strong>当方はカード番号を保持しません</strong>。
            当方は決済の成否・購入日時・Stripe 上の顧客識別子等の決済記録を取得します。
          </li>
          <li>
            <strong>サービス利用データ:</strong> 利用者の予想投票の内容、お気に入りチームの
            登録内容などを、当方のデータベース（Turso / libSQL）に利用者アカウントと
            紐付けて保存します。
          </li>
          <li>
            <strong>Cookie・ローカルストレージ:</strong> ログインセッションの維持、
            言語・表示設定の保持、多重投票防止のための匿名投票 ID の保存などに、
            Cookie およびローカルストレージ（localStorage）を使用します。
          </li>
          <li>
            <strong>アクセスに関する技術情報:</strong> 安定運用とセキュリティのため、
            サーバーやホスティング事業者において、アクセス日時・IP アドレス・ブラウザ情報
            などの技術的な情報が一時的に記録される場合があります。
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. 利用目的</h2>
        <ul className={styles.list}>
          <li>本サービスの提供（ログイン認証、決済処理、購入状態の管理）のため。</li>
          <li>お気に入り・予想投票・言語設定など、利用者向け機能の提供のため。</li>
          <li>予想投票の集計と、不正・多重投票の防止のため。</li>
          <li>本サービスの安定的な運用、品質改善、不正アクセス対策のため。</li>
          <li>利用者からのお問い合わせへの対応のため。</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. 外部サービスへの提供・委託</h2>
        <p className={styles.body}>
          当方は、本サービスの提供に必要な範囲で、以下の外部事業者に情報の処理を委託し、
          または情報が提供されます。各事業者における取り扱いは、各事業者のプライバシー
          ポリシーによります。これらの事業者には外国にある第三者が含まれます。
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Clerk, Inc.（認証基盤・米国）:</strong> メールアドレス・プロフィール情報・
            セッション情報。
          </li>
          <li>
            <strong>Stripe, Inc.（決済代行・米国）:</strong> 決済に必要な情報
            （カード情報は Stripe が直接取得し、当方を経由しません）。
          </li>
          <li>
            <strong>Turso（データベースホスティング）:</strong> 投票・お気に入り等の
            サービス利用データ。
          </li>
          <li>
            <strong>ホスティング事業者:</strong> 本サービスの配信に伴うアクセスログ等。
          </li>
        </ul>
        <p className={styles.body}>
          また、本サービスが表示する試合データ・天気情報は、外部 API（TheSportsDB、
          WeatherAPI.com）から取得しています。これらの取得はサーバー側で行われ、
          利用者の個人情報がこれらの API 提供者に送信されることはありません。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. 第三者提供</h2>
        <p className={styles.body}>
          当方は、前条の委託・提供および法令に基づく場合を除き、利用者の個人情報を本人の
          同意なく第三者に提供しません。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. Cookie・ローカルストレージの管理</h2>
        <p className={styles.body}>
          利用者は、ブラウザの設定により Cookie の受け入れを拒否したり、保存済みの Cookie・
          ローカルストレージを削除したりできます。ただし、これらを無効化・削除した場合、
          ログイン状態や言語設定が保持されないなど、本サービスの全部または一部が正常に
          動作しないことがあります。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. 保持期間</h2>
        <ul className={styles.list}>
          <li>
            アカウント情報・サービス利用データは、利用者が退会するまで、または本サービスの
            提供終了（2026年9月30日予定。<a href="/terms">利用規約</a>参照）後合理的な期間が
            経過するまで保持し、その後削除します。
          </li>
          <li>
            決済記録は、税法その他の法令上の保存義務に従い、法定の期間保持します。
          </li>
          <li>
            アクセスログ等の技術情報は、運用上必要な期間に限り保持します。
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>8. 開示・訂正・削除の請求</h2>
        <p className={styles.body}>
          利用者は、当方が保有する自己の個人情報について、開示・訂正・利用停止・削除を
          請求できます。アカウントおよび関連データの削除を希望される場合は、
          <strong>info@matchfav.com</strong>まで、登録メールアドレスからご連絡ください。
          本人確認のうえ、法令に基づき遅滞なく対応します（法令上保存が義務付けられる
          決済記録等を除きます）。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>9. 改定</h2>
        <p className={styles.body}>
          本ポリシーは、法令の改正やサービス内容の変更に応じて改定されることがあります。
          重要な変更を行う場合は、本サービス上で周知します。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>10. 運営者情報・お問い合わせ</h2>
        <p className={`${styles.body} ${styles.muted}`}>
          運営者は個人事業者です。運営者の氏名・所在地等は、
          <Link href="/tokushoho">特定商取引法に基づく表記</Link>に定める方法により、
          請求があった場合に遅滞なく開示します。本ポリシーに関するお問い合わせは
          <strong>info@matchfav.com</strong>までご連絡ください。
        </p>
      </section>

      <p className={`${styles.body} ${styles.muted}`}>
        関連ページ: <Link href="/terms">利用規約</Link> /{' '}
        <Link href="/tokushoho">特定商取引法に基づく表記</Link>
      </p>

      <Link href="/" className={styles.backLink}>
        ← トップへ戻る
      </Link>
    </article>
  );
}
