import type { Metadata } from 'next';
import Link from 'next/link';

import { FaqSection } from '@/components/FaqSection';
import { FAQ_CONTENT } from '@/lib/faq';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

import styles from '../legal.module.css';

/**
 * よくある質問（FAQ）ページ（T-94）。
 * フッターの一列リンクからここへ遷移する（ホーム本体には FAQ 塊を置かない）。
 * 法務ページと同じ legal レイアウトを流用。FAQ は検索向け公開コンテンツなので noindex は付けない。
 */
export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = getDictionary(await resolveLocale()).meta.faq;
  return {
    title,
    description,
    alternates: { canonical: '/faq' },
  };
}

export default async function FaqPage() {
  const locale = await resolveLocale();
  const content = FAQ_CONTENT[locale];

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <h1>{content.title}</h1>
      </header>

      <FaqSection locale={locale} />

      <Link href="/" className={styles.backLink}>
        ← トップへ戻る
      </Link>
    </article>
  );
}
