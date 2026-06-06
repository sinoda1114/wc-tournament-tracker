import { Container } from '@mantine/core';

/**
 * 法務ページ群（/terms・/privacy・/tokushoho）共通レイアウト。
 *
 * - `(legal)` は Route Group なので URL には現れない（/terms 等はそのまま）。
 * - ルートの layout.tsx（<html>/<body>・SiteHeader・SiteFooter）の内側に入るため、
 *   ここでは本文の横幅と上下余白だけを整える。
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container size="md" py="xl">
      {children}
    </Container>
  );
}
