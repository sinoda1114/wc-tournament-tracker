import type { Metadata } from 'next';
import Link from 'next/link';

import styles from '../legal.module.css';

/*
 * 利用規約ページ。
 *
 * 【重要・法的免責】
 *   本文面は本サービスの実態に沿って作成した「一般的な雛形」であり、法的助言ではありません。
 *   公開前、特に買い切り課金・ログイン必須化を導入する前に、必ず弁護士のレビューを受けて
 *   確定させてください。事業者情報（運営者名・連絡先）・準拠法・裁判管轄・課金/返金条件など、
 *   事業実態に応じて加筆・修正が必要な箇所が残っています。
 *
 * 実態の前提（2026-06 時点）:
 *   - 2026年の国際サッカー大会（決勝トーナメント等）に特化した非公式ファンサイト。
 *   - 現状はお気に入り（localStorage）・投票（匿名 cookie）のみ。アカウント登録・課金は未導入。
 *   - 将来、ログイン必須化と買い切り課金（登録から一定時間の無料期間）を予定。
 */

export const metadata: Metadata = {
  title: '利用規約 | WC 2026 トラッカー',
  description: 'WC 2026 トラッカー（非公式ファンサイト）の利用規約です。',
};

const UPDATED = '2026年6月6日';

export default function TermsPage() {
  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <h1>利用規約</h1>
        <span className={styles.updated}>最終改定日: {UPDATED}</span>
      </header>

      <p className={styles.notice}>
        本規約は一般的な雛形をもとにした暫定版です。記載の事業者情報・課金条件・準拠法等は、
        サービスの正式公開および課金導入の前に確定・修正されます。
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第1条（適用）</h2>
        <p className={styles.body}>
          本利用規約（以下「本規約」）は、当サイト（以下「本サービス」）の提供条件および本サービスの
          利用に関する運営者と利用者との間の権利義務関係を定めるものです。利用者は、本サービスを
          利用することにより、本規約に同意したものとみなされます。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第2条（本サービスの内容）</h2>
        <p className={styles.body}>
          本サービスは、2026年に開催される国際的なサッカー大会の試合日程・結果・出場国・会場などの
          情報を、ファン向けに見やすくまとめて提供する<strong>非公式の情報サイト</strong>です。
          本サービスは、FIFA（国際サッカー連盟）その他の大会主催者・公式スポンサー・各国サッカー協会とは
          一切関係がなく、これらから公認・後援・推奨を受けたものではありません。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第3条（情報の正確性・免責）</h2>
        <ul className={styles.list}>
          <li>
            本サービスが提供する試合日程・結果・順位・予想その他の情報は、可能な範囲で正確性に努めますが、
            その完全性・正確性・最新性・有用性を保証するものではありません。
          </li>
          <li>
            掲載情報は外部の公開データ等に基づいており、予告なく変更・削除される場合があります。
          </li>
          <li>
            本サービスの「優勝予想」「みんなの予想（投票）」等は娯楽目的の参考情報であり、
            賭博・投資その他の意思決定の根拠として利用することを意図していません。
          </li>
          <li>
            利用者が本サービスの情報を用いて行った一切の行為および結果について、運営者は責任を負いません。
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第4条（お気に入り・投票機能とデータの保存）</h2>
        <p className={styles.body}>
          本サービスでは、お気に入りチームの登録や予想投票などの機能のために、利用者の端末内の
          Cookie およびローカルストレージ（localStorage）を使用します。これらに保存される情報、
          および当該情報の取り扱いについては
          <Link href="/privacy">プライバシーポリシー</Link>に定めるとおりです。
          投票は同一利用者による多重投票を防ぐ目的で匿名の識別子を用いますが、個人を特定するもの
          ではありません。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第5条（アカウント・有料サービス）</h2>
        <ul className={styles.list}>
          <li>
            本サービスは、将来的にログインによる利用者登録を必須とし、買い切り型の有料機能を提供する
            予定です。これらの提供条件・料金・無料期間・解約および返金の取り扱いは、提供開始時に
            本規約および<Link href="/tokushoho">特定商取引法に基づく表記</Link>において別途定めます。
          </li>
          <li>
            有料サービスの導入前は、本条の課金関連条項は適用されません。
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第6条（知的財産権）</h2>
        <p className={styles.body}>
          本サービスに掲載される文章・デザイン・プログラム等の著作権その他の知的財産権は、
          運営者または正当な権利者に帰属します。なお、各国・各クラブ・大会・スポンサー等の名称、
          エンブレム、ロゴ等は、それぞれの権利者の商標等であり、本サービスはこれらを権利者の
          知的財産として尊重します。本サービスは公式ロゴ・公式エンブレムを使用しません。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第7条（禁止事項）</h2>
        <p className={styles.body}>
          利用者は、本サービスの利用にあたり、法令または公序良俗に違反する行為、本サービスの運営を
          妨害する行為、不正アクセス、自動化された手段による過度なアクセスや情報の大量取得、
          その他運営者が不適切と判断する行為を行ってはなりません。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第8条（サービスの変更・中断・終了）</h2>
        <p className={styles.body}>
          運営者は、利用者への事前の通知なく、本サービスの内容の変更、提供の中断または終了を
          行うことができます。これにより利用者または第三者に生じた損害について、運営者は責任を
          負いません。本サービスは特定の大会に関連した期間限定の提供となる場合があります。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第9条（規約の変更）</h2>
        <p className={styles.body}>
          運営者は、必要と判断した場合、利用者に通知することなく本規約を変更できます。変更後の
          本規約は、本サービス上に表示した時点から効力を生じます。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第10条（準拠法・裁判管轄）</h2>
        <p className={`${styles.body} ${styles.muted}`}>
          本規約の準拠法は日本法とし、本サービスに関して紛争が生じた場合には、運営者の所在地を
          管轄する裁判所を専属的合意管轄とする予定です（正式な所在地・管轄は公開時に確定します）。
        </p>
      </section>

      <Link href="/" className={styles.backLink}>
        ← トップへ戻る
      </Link>
    </article>
  );
}
