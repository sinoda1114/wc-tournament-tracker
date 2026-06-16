import { connection } from 'next/server';

import { auth } from '@clerk/nextjs/server';
import { Card, Stack, Text, Title } from '@mantine/core';

import { ButtonLink } from '@/components/RouterLink';
import { PurchaseButton } from '@/components/billing/PurchaseButton';
import { hasActiveEntitlement } from '@/db/queries/billing';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { currentPriceDisplay, isFreePeriod, priceDisplayForLocale } from '@/lib/pricing';

type EarlyBirdPurchaseProps = {
  locale: Locale;
  dict: Dictionary;
};

/**
 * 無料期間中の「早割で先行購入」導線（T-14 / 早割導線）。
 *
 * 無料期間中は誰でも決勝T投票が解放されるため {@link PaywallLock} は出ない。
 * その間も早割（決勝T開始 6/29 より前の安い価格）で買い切りを先行購入できるよう、
 * 自己ゲートでこのカードを出す。
 *
 * 表示条件（自己ゲート・サーバ判定）:
 * - 無料期間中のみ（{@link isFreePeriod}）。決勝T開始後は PaywallLock 側に委ねるため null。
 * - 既に購入済み（active entitlement）のユーザーには出さない。
 *
 * 実際の課金額は決済時点でサーバが早割/通常を決める（{@link PurchaseButton} は locale のみ送る）。
 */
export async function EarlyBirdPurchase({ locale, dict }: EarlyBirdPurchaseProps) {
  await connection();
  if (!isFreePeriod(new Date())) return null;

  const { userId } = await auth();
  if (userId) {
    try {
      if (await hasActiveEntitlement(userId)) return null;
    } catch {
      // entitlement 取得失敗時はカードを出す（購入導線は塞がない・fail-open でユーザー機会を残す）。
    }
  }

  const t = dict.paywall;
  const earlyPrice = currentPriceDisplay(locale, new Date());
  const regularPrice = priceDisplayForLocale(locale);

  const body = t.earlyBody
    .replace('{earlyPrice}', earlyPrice)
    .replace('{regularPrice}', regularPrice);
  const ctaLabel = t.earlyCta.replace('{earlyPrice}', earlyPrice);
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';

  return (
    <Card withBorder padding="lg" radius="md" maw={560} mx="auto">
      <Stack gap="sm">
        <Title order={2} size="h3">
          {t.earlyTitle}
        </Title>
        <Text>{body}</Text>
        {userId ? (
          <PurchaseButton
            locale={locale}
            label={ctaLabel}
            loadingLabel={t.purchasing}
            errorLabel={t.purchaseError}
          />
        ) : (
          <ButtonLink href={signInUrl} size="md">
            {t.lockSignIn}
          </ButtonLink>
        )}
      </Stack>
    </Card>
  );
}
