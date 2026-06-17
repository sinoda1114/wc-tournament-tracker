import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';

import styles from './legal.module.css';

/**
 * 法務ページ（/terms・/privacy・/tokushoho）の多言語版 共通モデル＆描画（T-114）。
 *
 * 方針:
 *  - 日本語(ja)は正本としてページ側の既存JSXをそのまま描画する（このモジュールは使わない）。
 *  - en/es/pt/zh は各ページの content モジュール（Record<Lang, …>）を本モジュールで描画する。
 *  - 本文は太字・内部リンク・外部リンクを保持できる「インラインRun」で表現する。
 *    特に利用規約 第6条の CC BY-SA 帰属（Wikipedia / ライセンスへの外部リンク）は
 *    ライセンス義務のため翻訳版でも必ず保持する。
 *  - 翻訳版には先頭に「参考訳・正本は日本語版」の免責注記を表示する。
 */

/** 日本語(正本)以外の対応言語。 */
export type TranslatedLang = 'en' | 'es' | 'pt' | 'zh';

/** 本文中のインライン要素。文字列＝素のテキスト。 */
export type Run =
  | string
  | { b: string } // 太字
  | { link: { href: string; text: string } } // サイト内リンク
  | { ext: { href: string; text: string } }; // 外部リンク（CC BY-SA 帰属等）

/** ブロック要素: 段落 または 箇条書き。 */
export type Block = { p: Run[] } | { ul: Run[][] };

/** 見出し付きセクション（terms / privacy 用）。 */
export type LegalSection = { heading: string; blocks: Block[] };

/** ページ下部の共通要素（関連リンク・戻るリンク・免責注記）。 */
type LegalChrome = {
  title: string;
  updatedLabel: string;
  updated: string;
  /** 翻訳版の免責注記（参考訳・正本は日本語版）。 */
  referenceNote: string;
  relatedLabel: string;
  related: { href: string; text: string }[];
  backLabel: string;
};

/** セクション型ドキュメント（利用規約・プライバシー）。 */
export type LegalSectionsDoc = LegalChrome & { sections: LegalSection[] };

/** 定義リスト型ドキュメント（特商法表記）。 */
export type LegalItemsDoc = LegalChrome & {
  items: { label: string; value: Run[] }[];
};

function renderRuns(runs: Run[]): ReactNode {
  return runs.map((run, i) => {
    if (typeof run === 'string') return <Fragment key={i}>{run}</Fragment>;
    if ('b' in run) return <strong key={i}>{run.b}</strong>;
    if ('link' in run) {
      return (
        <Link key={i} href={run.link.href}>
          {run.link.text}
        </Link>
      );
    }
    return (
      <a key={i} href={run.ext.href} target="_blank" rel="noreferrer">
        {run.ext.text}
      </a>
    );
  });
}

function renderBlock(block: Block, key: number): ReactNode {
  if ('p' in block) {
    return (
      <p key={key} className={styles.body}>
        {renderRuns(block.p)}
      </p>
    );
  }
  return (
    <ul key={key} className={styles.list}>
      {block.ul.map((item, i) => (
        <li key={i}>{renderRuns(item)}</li>
      ))}
    </ul>
  );
}

/** 翻訳版に共通の上部免責（参考訳）＋見出し。 */
function LegalHeader({ chrome }: { chrome: LegalChrome }) {
  return (
    <>
      <header className={styles.header}>
        <h1>{chrome.title}</h1>
        <span className={styles.updated}>
          {chrome.updatedLabel}: {chrome.updated}
        </span>
      </header>
      <p className={styles.referenceNote} role="note">
        {chrome.referenceNote}
      </p>
    </>
  );
}

/** 翻訳版に共通の下部（関連リンク＋戻る）。 */
function LegalFooterLinks({ chrome }: { chrome: LegalChrome }) {
  return (
    <>
      <p className={`${styles.body} ${styles.muted}`}>
        {chrome.relatedLabel}{' '}
        {chrome.related.map((r, i) => (
          <Fragment key={r.href}>
            {i > 0 ? ' / ' : null}
            <Link href={r.href}>{r.text}</Link>
          </Fragment>
        ))}
      </p>
      <Link href="/" className={styles.backLink}>
        ← {chrome.backLabel}
      </Link>
    </>
  );
}

/** セクション型（利用規約・プライバシー）の翻訳版描画。 */
export function LegalSectionsArticle({ doc }: { doc: LegalSectionsDoc }) {
  return (
    <article className={styles.page}>
      <LegalHeader chrome={doc} />
      {doc.sections.map((section, si) => (
        <section key={si} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.heading}</h2>
          {section.blocks.map((block, bi) => renderBlock(block, bi))}
        </section>
      ))}
      <LegalFooterLinks chrome={doc} />
    </article>
  );
}

/** 定義リスト型（特商法表記）の翻訳版描画。 */
export function LegalItemsArticle({ doc }: { doc: LegalItemsDoc }) {
  return (
    <article className={styles.page}>
      <LegalHeader chrome={doc} />
      <section className={styles.section}>
        <dl className={styles.defList}>
          {doc.items.map((item) => (
            <div key={item.label} style={{ display: 'contents' }}>
              <dt>{item.label}</dt>
              <dd>{renderRuns(item.value)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <LegalFooterLinks chrome={doc} />
    </article>
  );
}

/** 参考訳の免責（正本は日本語版）。各 content はこれを土台に必要なら注記を足す。 */
export const REFERENCE_NOTE: Record<TranslatedLang, string> = {
  en: 'This is a reference translation. The Japanese version is the authoritative text; in case of any discrepancy, the Japanese version prevails.',
  es: 'Esta es una traducción de referencia. La versión en japonés es el texto auténtico; en caso de discrepancia, prevalecerá la versión en japonés.',
  pt: 'Esta é uma tradução de referência. A versão em japonês é o texto oficial; em caso de divergência, prevalece a versão em japonês.',
  zh: '本翻译仅供参考。以日语版本为准；如有歧义，以日语版本为准。',
};
