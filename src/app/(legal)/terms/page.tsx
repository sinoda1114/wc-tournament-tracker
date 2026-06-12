import type { Metadata } from 'next';
import Link from 'next/link';

import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

import styles from '../legal.module.css';

/*
 * 利用規約ページ（清書版・弁護士レビュー前ドラフト完成版）。
 *
 * 【法的免責】
 *   本文面は本サービスの実態（ログイン必須・買い切り課金・グループステージ無料／決勝トーナメント以降有料・期間中新規登録は72時間無料）に沿って
 *   作成したドラフトであり、法的助言ではありません。公開前に必ず弁護士のレビューを受けること。
 *
 * 【未確定事項】
 *   - 販売価格は購入手続き画面（Stripe Checkout）に表示する方式。決済導線の実装は #14。
 */

// T-19: metadata はロケール対応（本文の多言語化は別タスク）。
export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = getDictionary(await resolveLocale()).meta.terms;
  return { title, description };
}

const UPDATED = '2026年6月11日';

export default function TermsPage() {
  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <h1>利用規約</h1>
        <span className={styles.updated}>最終改定日: {UPDATED}</span>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第1条（適用）</h2>
        <p className={styles.body}>
          本利用規約（以下「本規約」といいます）は、運営者（第14条に定める方法で開示します。以下
          「当方」といいます）が提供するウェブサービス「MatchFav（マッチファボ）」
          （ドメイン: <strong>matchfav.com</strong>。以下「本サービス」といいます）の提供条件および本サービスの利用に関する当方と利用者との間の権利義務関係を
          定めるものです。利用者は、本サービスのアカウント登録または利用をもって、本規約に
          同意したものとみなされます。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第2条（本サービスの内容・FIFA非公認）</h2>
        <ul className={styles.list}>
          <li>
            本サービスは、2026年に開催される国際的なサッカー大会（以下「本大会」）の試合日程・
            結果・出場国・会場・天気などの情報を、ファン向けに見やすくまとめて提供する
            <strong>非公式の情報サービス</strong>です。
          </li>
          <li>
            <strong>
              本サービスは、FIFA（国際サッカー連盟）、本大会の主催者・運営組織、公式スポンサー、
              各国サッカー協会のいずれとも一切関係がなく、これらから公認・後援・推奨・許諾を
              受けたものではありません。
            </strong>
            本サービスは公式ロゴ・公式エンブレム・公式呼称の商標を使用しません。
          </li>
          <li>
            本サービスは本大会に関連した<strong>期間限定のサービス</strong>であり、
            <strong>2026年9月30日（日本時間）をもって提供を終了する予定</strong>です
            （終了日を変更する場合は、本サービス上で事前に告知します）。提供終了後、
            投票・お気に入り等の利用者データは合理的な期間内に削除します。利用者は、
            購入時点でこの提供期間をあらかじめ了承のうえ購入するものとします。
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第3条（アカウント登録）</h2>
        <ul className={styles.list}>
          <li>
            本サービスの利用には、当方所定の方法（Google アカウント等による外部認証）での
            ログイン登録が必要です。
          </li>
          <li>
            利用者は、自己の責任においてアカウントを管理するものとし、第三者に利用させ、
            または貸与・譲渡してはなりません。
          </li>
          <li>
            当方は、利用者が本規約に違反した場合、または不正利用のおそれがあると判断した場合、
            事前の通知なくアカウントの利用停止・削除を行うことができます。
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第4条（有料サービス・無料期間）</h2>
        <ul className={styles.list}>
          <li>
            本サービスは、<strong>買い切り型</strong>の有料サービスです。利用者は、所定の料金
            （各プランの購入手続き画面に表示します）を一度支払うことにより、本大会終了に伴う
            サービス提供終了時まで本サービスを利用できます。
            月額・年額等の継続課金（サブスクリプション）ではありません。
          </li>
          <li>
            本大会のグループステージ期間は、すべての登録利用者が無料で本サービスを
            利用できます。無料期間の終期は
            <strong>2026年6月29日 0時00分（日本時間）＝ 2026年6月28日 15時00分（UTC）</strong>
            とし、同時刻以降（決勝トーナメント期間）の利用には、前号の料金の支払いが
            必要です（以上を総称して以下「無料期間」）。
          </li>
          <li>
            前号にかかわらず、前号の無料期間終期（2026年6月29日 0時00分（日本時間））以降に
            新たにアカウント登録を完了した利用者は、登録完了時から<strong>72時間</strong>に限り、
            無料で本サービスを利用できます。
          </li>
          <li>
            無料期間中に支払いがなされない場合でも、自動的に課金されることはありません。
          </li>
          <li>決済は、外部の決済代行事業者の提供するシステムを通じて行われます。</li>
          <li>料金は表示された時点の消費税を含む総額で表示します。</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第5条（返金・キャンセル）</h2>
        <ul className={styles.list}>
          <li>
            本サービスは決済完了後ただちに全機能が提供されるデジタルコンテンツであるため、
            その性質上、決済完了後の利用者都合による返金・キャンセルには
            <strong>原則として応じられません</strong>。購入前に無料期間を利用して内容を
            十分にご確認ください。
          </li>
          <li>
            前号にかかわらず、当方の責に帰すべき事由により本サービスが相当期間利用できなかった
            場合、二重決済が生じた場合その他当方が必要と認める場合には、当方は個別に返金等の
            対応を行うことがあります。返金に関するお問い合わせは
            <strong>info@matchfav.com</strong>までご連絡ください。
          </li>
          <li>
            返金・キャンセルの詳細は<Link href="/tokushoho">特定商取引法に基づく表記</Link>の
            定めによります。
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第6条（情報の正確性・免責）</h2>
        <ul className={styles.list}>
          <li>
            本サービスが提供する試合日程・結果・順位・選手情報・天気予報その他の情報は、
            外部の公開データソースに基づいています。当方は可能な範囲で正確性に努めますが、
            これらは無料・公開のデータソースという性質上、
            <strong>欠落・遅延・誤りが生じることがあり</strong>、
            その完全性・正確性・最新性・有用性を保証しません。
          </li>
          <li>
            天気情報は予報であり、実際の気象状況と異なる場合があります。観戦・移動その他の
            判断は、公式の発表・予報を必ず確認のうえ行ってください。
          </li>
          <li>
            「優勝予想」「みんなの予想（投票）」等は娯楽目的の参考情報であり、賭博・投資その他の
            意思決定の根拠として利用することを意図していません。
          </li>
          <li>
            利用者が本サービスの情報を用いて行った一切の行為および結果について、当方は責任を
            負いません。
          </li>
          <li>
            当方が利用者に対して損害賠償責任を負う場合であっても、当方に故意または重過失がある
            場合を除き、その賠償額は利用者が本サービスに対して支払った料金の額を上限とします。
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第7条（データの保存・Cookie 等）</h2>
        <p className={styles.body}>
          本サービスは、お気に入りチームの登録、予想投票、言語・表示設定などの機能のために、
          利用者の端末内に Cookie 等を保存し、また当方のデータベースに情報を保存します。
          取得する情報および取り扱いの詳細は
          <Link href="/privacy">プライバシーポリシー</Link>に定めるとおりです。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第8条（知的財産権）</h2>
        <p className={styles.body}>
          本サービスに掲載される文章・デザイン・プログラム等の著作権その他の知的財産権は、
          当方または正当な権利者に帰属します。各国・各クラブ・大会・スポンサー等の名称、
          エンブレム、ロゴ等はそれぞれの権利者の商標等であり、本サービスはこれらを権利者の
          知的財産として尊重し、公式ロゴ・公式エンブレムを使用しません。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第9条（禁止事項）</h2>
        <ul className={styles.list}>
          <li>法令または公序良俗に違反する行為</li>
          <li>本サービスの運営を妨害する行為、サーバー等への不正アクセス</li>
          <li>自動化された手段（ボット・スクレイピング等）による過度なアクセスや情報の大量取得</li>
          <li>本サービスの全部または一部の複製・再配布・転売、アカウントの共有・譲渡</li>
          <li>多重投票その他の不正な方法による投票・予想機能の利用</li>
          <li>本サービスを賭博その他の違法行為に利用する行為</li>
          <li>その他、当方が不適切と判断する行為</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第10条（サービスの変更・中断・終了）</h2>
        <p className={styles.body}>
          当方は、システム保守、外部データソースの障害、その他やむを得ない事由がある場合、
          利用者への事前の通知なく、本サービスの内容の変更、提供の一時中断を行うことができます。
          また、本サービスは本大会に関連した期間限定の提供であり、本大会終了後にサービスを
          終了することがあります。当方は、これらにより利用者または第三者に生じた損害について、
          第6条第5号の範囲を超えて責任を負いません。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第11条（退会・データの削除）</h2>
        <p className={styles.body}>
          利用者は、当方所定の方法によりいつでも退会できます。退会した場合、買い切り料金の
          返金は第5条の定めによります。退会に伴う利用者データの取り扱いは
          <Link href="/privacy">プライバシーポリシー</Link>に定めるとおりです。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第12条（規約の変更）</h2>
        <p className={styles.body}>
          当方は、本規約の変更が利用者の一般の利益に適合する場合、または変更が契約目的に反せず
          かつ合理的なものである場合、民法第548条の4の定型約款の変更に関する規定に基づき、
          本規約を変更できます。変更する場合は、効力発生日を定め、本サービス上での表示その他
          適切な方法により事前に周知します。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第13条（準拠法・裁判管轄）</h2>
        <p className={styles.body}>
          本規約の準拠法は日本法とします。本サービスに関して当方と利用者との間で紛争が生じた
          場合には、当方（運営者）の所在地を管轄する地方裁判所または簡易裁判所を第一審の
          専属的合意管轄裁判所とします。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>第14条（運営者情報・お問い合わせ）</h2>
        <p className={`${styles.body} ${styles.muted}`}>
          運営者は個人事業者です。運営者の氏名・所在地等は、
          <Link href="/tokushoho">特定商取引法に基づく表記</Link>に定める方法により、
          請求があった場合に遅滞なく開示します。本規約に関するお問い合わせは
          <strong>info@matchfav.com</strong>までご連絡ください。
        </p>
      </section>

      <p className={`${styles.body} ${styles.muted}`}>
        関連ページ: <Link href="/privacy">プライバシーポリシー</Link> /{' '}
        <Link href="/tokushoho">特定商取引法に基づく表記</Link>
      </p>

      <Link href="/" className={styles.backLink}>
        ← トップへ戻る
      </Link>
    </article>
  );
}
