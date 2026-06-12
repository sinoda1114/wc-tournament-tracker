import Link from 'next/link';

import { Button, Container, Stack, Text, Title } from '@mantine/core';

import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/**
 * 決済完了の戻り先（T-14）。entitlement の確定は webhook が行うため、ここでは
 * サンクスを表示するのみ（session_id は表示せず、信頼の真偽判定にも使わない）。
 */
export default async function BillingSuccessPage() {
  const locale = await resolveLocale();
  const t = getDictionary(locale).paywall;

  return (
    <Container size="sm" py="xl">
      <Stack gap="md" align="center">
        <Title order={1} size="h2">
          {t.successTitle}
        </Title>
        <Text ta="center">{t.successBody}</Text>
        <Button component={Link} href="/prediction" size="md">
          {t.successCta}
        </Button>
      </Stack>
    </Container>
  );
}
