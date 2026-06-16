import { redirect } from 'next/navigation';
import { Container } from '@mantine/core';

import { EarlyBirdPurchase } from '@/components/billing/EarlyBirdPurchase';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';
import { isFreePeriod } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

/** 早割購入ページ。バナーCTAの着地点。無料期間外は /prediction に転送。 */
export default async function BuyPage() {
  if (!isFreePeriod(new Date())) redirect('/prediction');

  const locale = await resolveLocale();
  const dict = getDictionary(locale);

  return (
    <Container size="sm" py="xl">
      <EarlyBirdPurchase locale={locale} dict={dict} />
    </Container>
  );
}
