'use client';

import { useState } from 'react';

import { Button, Text } from '@mantine/core';

import type { Locale } from '@/lib/i18n/config';

type PurchaseButtonProps = {
  locale: Locale;
  /** 表示ラベル（例: "¥980 で購入する"）。 */
  label: string;
  /** 決済ページ移動中ラベル。 */
  loadingLabel: string;
  /** 失敗時メッセージ。 */
  errorLabel: string;
};

/**
 * 買い切り購入ボタン（T-14・クライアント）。
 * `/api/stripe/checkout` に POST → 返ってきた Stripe Checkout URL へ遷移する。
 * 金額・価格はサーバが決めるため、ここでは locale ヒントのみ送る（金額は送らない）。
 */
export function PurchaseButton({ locale, label, loadingLabel, errorLabel }: PurchaseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      const data = (await res.json()) as { ok?: boolean; url?: string };
      if (res.ok && data.ok && typeof data.url === 'string') {
        window.location.assign(data.url);
        return; // 遷移するのでローディング維持。
      }
      setError(true);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={handleClick} loading={loading} size="md">
        {loading ? loadingLabel : label}
      </Button>
      {error ? (
        <Text c="red" size="sm" mt="xs" role="alert">
          {errorLabel}
        </Text>
      ) : null}
    </div>
  );
}
