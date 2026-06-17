import { EMAIL_PATTERN, FAQ_CONTENT, faqJsonLd } from '@/lib/faq';
import type { Locale } from '@/lib/i18n/config';

type FaqSectionProps = {
  locale: Locale;
};

/**
 * よくある質問（FAQ）の本体（T-94）。専用ページ `/faq` で使う。
 *
 * - サーバーコンポーネント。`<details>/<summary>` で JS なしの開閉を実現（アクセシブル＆SEO）。
 * - schema.org FAQPage の JSON-LD を併せて出力する（検索リッチリザルト対応）。
 * - メールアドレス単体の段落は mailto リンクにする。
 * - 見出し（ページタイトル）は呼び出し側（/faq ページ）が持つため、ここでは描画しない。
 */
export function FaqSection({ locale }: FaqSectionProps) {
  const content = FAQ_CONTENT[locale];
  // JSON-LD は自前の静的文字列のみ。"<" をエスケープして </script> による早期終了を防ぐ。
  const jsonLd = JSON.stringify(faqJsonLd(content)).replace(/</g, '\\u003c');

  return (
    <section className="wc-faq" aria-label={content.title}>
      {content.categories.map((category) => (
        <div key={category.heading} className="wc-faq-category">
          <h3 className="wc-faq-category-heading">{category.heading}</h3>
          {category.items.map((item) => (
            <details key={item.q} className="wc-faq-item">
              <summary className="wc-faq-q">{item.q}</summary>
              <div className="wc-faq-a">
                {item.a.map((paragraph, index) => (
                  <p key={index}>
                    {EMAIL_PATTERN.test(paragraph) ? (
                      <a href={`mailto:${paragraph}`}>{paragraph}</a>
                    ) : (
                      paragraph
                    )}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      ))}

      {/* 自前の静的 JSON-LD のみ（ユーザー入力なし・"<" はエスケープ済み）＝XSS リスクなし。 */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </section>
  );
}
