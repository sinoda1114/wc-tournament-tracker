import Link from 'next/link';

import { Button, Container, Stack, Text, Title } from '@mantine/core';

import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/** 決済キャンセルの戻り先（T-14）。決済は行われていない旨を表示する。 */
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
        <Button component={Link} href="/" size="md" variant="default">
          {t.cancelCta}
        </Button>
      </Stack>
    </Container>
  );
}
