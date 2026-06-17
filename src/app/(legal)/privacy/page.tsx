import type { Metadata } from 'next';
import Link from 'next/link';

import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

import { LegalSectionsArticle } from '../legalShared';
import styles from '../legal.module.css';
import { PRIVACY_CONTENT } from './content';

/*
 * プライバシーポリシーページ（清書版・弁護士レビュー前ドラフト）。
 *
 * 【法的免責】
 *   本文面は法的助言ではありません。公開前に弁護士レビューを受けること。
 *   個人情報保護法で求められる項目（取得情報・利用目的・委託/第三者提供・
 *   外国にある第三者への提供・保持期間・開示等請求の窓口・連絡先）は維持し、
 *   個別の外部事業者名・技術スタックの詳細は記載しない方針（必要最低限）。
 *
 * 【プレースホルダ】
 *   - info@matchfav.com … 事業用メールアドレス確定後に置換
 */

// T-19: metadata はロケール対応（本文の多言語化は別タスク）。
export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = getDictionary(await resolveLocale()).meta.privacy;
  return { title, description };
}

const UPDATED = '2026年6月11日';

export default async function PrivacyPage() {
  // 日本語は正本（下記JSX）をそのまま。en/es/pt/zh は参考訳コンテンツを描画（T-114）。
  const locale = await resolveLocale();
  if (locale !== 'ja') {
    return <LegalSectionsArticle doc={PRIVACY_CONTENT[locale]} />;
  }
  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <h1>プライバシーポリシー</h1>
        <span className={styles.updated}>最終改定日: {UPDATED}</span>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. 基本方針</h2>
        <p className={styles.body}>
          運営者（以下「当方」）は、当方が提供するウェブサービス「MatchFav（マッチファボ）」
          （以下「本サービス」）における利用者の個人情報を、個人情報の保護に関する法律
          その他の関係法令を遵守し、適切に取り扱います。本サービスは FIFA 非公認の
          非公式ファンサイトです。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. 取得する情報</h2>
        <ul className={styles.list}>
          <li>
            <strong>アカウント情報:</strong> 外部の認証基盤を通じたログイン時に、
            メールアドレス・表示名・プロフィール画像などの情報を取得します。
            パスワードを当方が保持することはありません。
          </li>
          <li>
            <strong>決済情報:</strong> 有料サービスの決済は外部の決済代行事業者を通じて
            行われ、<strong>当方はクレジットカード番号を保持しません</strong>。
            当方は決済の成否・購入日時等の決済記録のみを取得します。
          </li>
          <li>
            <strong>サービス利用データ:</strong> 予想投票の内容、お気に入りチームの登録内容
            などを、利用者アカウントに紐付けて保存します。
          </li>
          <li>
            <strong>端末に保存する情報:</strong> ログイン状態の維持、言語・表示設定の保持、
            多重投票防止などのために、利用者の端末に Cookie 等の情報を保存します。
          </li>
          <li>
            <strong>技術情報:</strong> 安定運用とセキュリティのため、アクセス日時・
            IP アドレス・ブラウザ情報などが一時的に記録される場合があります。
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. 利用目的</h2>
        <ul className={styles.list}>
          <li>本サービスの提供（ログイン認証、決済処理、購入状態の管理）のため。</li>
          <li>お気に入り・予想投票・言語設定など、利用者向け機能の提供のため。</li>
          <li>予想投票の集計と、不正・多重投票の防止のため。</li>
          <li>本サービスの安定運用・品質改善・不正アクセス対策のため。</li>
          <li>利用者からのお問い合わせへの対応のため。</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. 外部サービスへの委託・提供</h2>
        <p className={styles.body}>
          当方は、本サービスの提供に必要な範囲で、認証・決済・データ保存・配信などを
          外部事業者に委託しており、その範囲で利用者の情報が各事業者に提供されます。
          各事業者における取り扱いは、各事業者のプライバシーポリシーによります。
          これらの事業者には<strong>外国にある第三者が含まれます</strong>。
          前記の委託および法令に基づく場合を除き、当方は利用者の個人情報を本人の同意なく
          第三者に提供しません。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. 保持期間</h2>
        <ul className={styles.list}>
          <li>
            アカウント情報・サービス利用データは、利用者が退会するまで、または本サービスの
            提供終了（2026年9月30日予定。<Link href="/terms">利用規約</Link>参照）後
            合理的な期間が経過するまで保持し、その後削除します。
          </li>
          <li>決済記録は、法令上の保存義務に従い、法定の期間保持します。</li>
          <li>技術情報は、運用上必要な期間に限り保持します。</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. 開示・訂正・削除の請求</h2>
        <p className={styles.body}>
          利用者は、当方が保有する自己の個人情報について、開示・訂正・利用停止・削除を
          請求できます。アカウントおよび関連データの削除を希望される場合は、
          <strong>info@matchfav.com</strong> まで、登録メールアドレスからご連絡ください。
          本人確認のうえ、法令に基づき遅滞なく対応します（法令上保存が義務付けられる
          決済記録等を除きます）。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. 改定</h2>
        <p className={styles.body}>
          本ポリシーは、法令の改正やサービス内容の変更に応じて改定されることがあります。
          重要な変更を行う場合は、本サービス上で周知します。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>8. 運営者情報・お問い合わせ</h2>
        <p className={`${styles.body} ${styles.muted}`}>
          運営者は個人事業者です。運営者の氏名・所在地等は、
          <Link href="/tokushoho">特定商取引法に基づく表記</Link>に定める方法により、
          請求があった場合に遅滞なく開示します。本ポリシーに関するお問い合わせは
          <strong>info@matchfav.com</strong> までご連絡ください。
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
