import { Container, Stack, Text, Title } from '@mantine/core';

import { ButtonLink } from '@/components/RouterLink';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/**
 * 決済キャンセルの戻り先（T-14）。決済は行われていない旨を表示する。
 *
 * NOTE: Server Component から Mantine の Button へ `component={Link}`（関数）を直接渡すと
 * 実行時 throw するため、クライアント側ラッパ `ButtonLink` を使う（[[rsc-component-link-routerlink]]）。
 */
export default async function BillingCancelPage() {
  const locale = await resolveLocale();
  const t = getDictionary(locale).paywall;

  return (
    <Container size="sm" py="xl">
      <Stack gap="md" align="center">
        <Title order={1} size="h2">
          {t.cancelTitle}
        </Title>
        <Text ta="center">{t.cancelBody}</Text>
        <ButtonLink href="/" size="md" variant="default">
          {t.cancelCta}
        </ButtonLink>
      </Stack>
    </Container>
  );
}
