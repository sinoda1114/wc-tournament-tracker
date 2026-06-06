/**
 * JSON-LD 構造化データを `<script type="application/ld+json">` で出力する共通コンポーネント。
 *
 * - Server Component（"use client" を付けない）。RSC からそのまま描画できる。
 * - 値は JSON.stringify でシリアライズする。XSS 緩和のため、HTML パーサが
 *   `</script>` を誤検出して早期終了しないよう `<` をエスケープする
 *   （構造化データに任意ユーザ入力は載せない想定だが、防御的に常時適用）。
 */
type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // 構造化データは静的に生成した object のみを渡す（任意 HTML を注入しない）。
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
