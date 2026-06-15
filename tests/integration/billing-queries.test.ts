import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createClient, type Client } from '@libsql/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  activateEntitlement,
  getEntitlement,
  hasActiveEntitlement,
  markStripeEventProcessed,
  unmarkStripeEventProcessed,
} from '@/db/queries/billing';
import { resetDbForTesting, setDbForTesting } from '@/db/client';

const migrationPath = fileURLToPath(
  new URL('../../src/db/migrations/0013_entitlements.sql', import.meta.url),
);

let client: Client;

beforeEach(async () => {
  client = createClient({ url: ':memory:' });
  const sql = readFileSync(migrationPath, 'utf8');
  for (const statement of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
    await client.execute(statement);
  }
  setDbForTesting(client);
});

afterEach(() => {
  resetDbForTesting();
  client.close();
});

describe('hasActiveEntitlement / activateEntitlement', () => {
  it('未購入ユーザーは false', async () => {
    expect(await hasActiveEntitlement('user_x')).toBe(false);
  });

  it('購入を確定すると active になる', async () => {
    await activateEntitlement({
      userId: 'user_x',
      stripeCustomerId: 'cus_1',
      stripeSessionId: 'cs_1',
    });
    expect(await hasActiveEntitlement('user_x')).toBe(true);
    const row = await getEntitlement('user_x');
    expect(row?.status).toBe('active');
    expect(row?.stripeCustomerId).toBe('cus_1');
    expect(row?.purchasedAt).not.toBeNull();
  });

  it('同一ユーザーの再適用は冪等（purchased_at は初回を保持）', async () => {
    await activateEntitlement({ userId: 'u', stripeCustomerId: 'cus_1', stripeSessionId: 'cs_1' });
    const first = await getEntitlement('u');
    await activateEntitlement({ userId: 'u', stripeCustomerId: 'cus_2', stripeSessionId: 'cs_2' });
    const second = await getEntitlement('u');
    expect(second?.status).toBe('active');
    // purchased_at は初回を保持（COALESCE）。
    expect(second?.purchasedAt).toBe(first?.purchasedAt);
    // 顧客/セッションは最新で上書き。
    expect(second?.stripeCustomerId).toBe('cus_2');
  });
});

describe('markStripeEventProcessed（冪等ゲート）', () => {
  it('初回は true、再送は false', async () => {
    expect(await markStripeEventProcessed('evt_1')).toBe(true);
    expect(await markStripeEventProcessed('evt_1')).toBe(false);
  });

  it('unmark で取り消すと再び処理できる', async () => {
    expect(await markStripeEventProcessed('evt_2')).toBe(true);
    await unmarkStripeEventProcessed('evt_2');
    expect(await markStripeEventProcessed('evt_2')).toBe(true);
  });
});
