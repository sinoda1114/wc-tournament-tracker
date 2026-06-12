import Link from 'next/link';

import { auth } from '@clerk/nextjs/server';
import { Button, Card, Stack, Text, Title } from '@mantine/core';

import { PurchaseButton } from '@/components/billing/PurchaseButton';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { OFFER_END_DISPLAY, priceDisplayForLocale } from '@/lib/pricing';

type PaywallLockProps = {
  locale: Locale;
  dict: Dictionary;
};

/**
 * 課金壁の表示（T-14）。決勝T関連コンテンツが entitlement 未保有のときに代わりに出す。
 *
 * - ログイン済み: 購入ボタン（{@link PurchaseButton}）を出す。
 * - 未ログイン: sign-in へ誘導（未ログインで購入導線→ sign-in）。
 * - 提供期間（〜2026-09-30・T-29）を明示する。
 *
 * 価格表示は通常価格（{@link priceDisplayForLocale}）。実際の課金額は決済時点で
 * サーバが早割/通常を決定する（早割中は決済画面でより安い額になる）。
 */
export async function PaywallLock({ locale, dict }: PaywallLockProps) {
  const { userId } = await auth();
  const t = dict.paywall;
  const price = priceDisplayForLocale(locale);

  const lockBody = t.lockBody.replace('{price}', price);
  const offerPeriod = t.offerPeriod.replace('{offerEnd}', OFFER_END_DISPLAY);
  const ctaLabel = t.lockCta.replace('{price}', price);
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';

  return (
    <Card withBorder padding="lg" radius="md" maw={560} mx="auto">
      <Stack gap="sm">
        <Title order={2} size="h3">
          {t.lockTitle}
        </Title>
        <Text>{lockBody}</Text>
        <Text size="sm" c="dimmed">
          {offerPeriod}
        </Text>
        {userId ? (
          <PurchaseButton
            locale={locale}
            label={ctaLabel}
            loadingLabel={t.purchasing}
            errorLabel={t.purchaseError}
          />
        ) : (
          <Button component={Link} href={signInUrl} size="md">
            {t.lockSignIn}
          </Button>
        )}
      </Stack>
    </Card>
  );
}
