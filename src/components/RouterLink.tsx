'use client';

import Link from 'next/link';
import { Anchor, Button, Text } from '@mantine/core';
import type { AnchorProps, ButtonProps, TextProps } from '@mantine/core';
import type { ReactNode } from 'react';

/**
 * Server Component から Mantine の polymorphic コンポーネントへ next/link の
 * `component={Link}`（＝関数）を直接渡すと、React 19.2 / Next 16 で
 * 「Functions cannot be passed directly to Client Components」エラーになる。
 * 関数渡しを 'use client' 境界の内側へ隠蔽するためのラッパー群。
 * Server Component 側へは href / children 等のシリアライズ可能な props だけが渡る。
 */

type LinkExtras = {
  href: string;
  children?: ReactNode;
  title?: string;
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean;
  'aria-label'?: string;
};

export function ButtonLink({ href, children, ...props }: ButtonProps & LinkExtras) {
  return (
    <Button component={Link} href={href} {...props}>
      {children}
    </Button>
  );
}

export function AnchorLink({ href, children, ...props }: AnchorProps & LinkExtras) {
  return (
    <Anchor component={Link} href={href} {...props}>
      {children}
    </Anchor>
  );
}

export function TextLink({ href, children, ...props }: TextProps & LinkExtras) {
  return (
    <Text component={Link} href={href} {...props}>
      {children}
    </Text>
  );
}
