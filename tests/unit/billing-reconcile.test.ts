import { describe, expect, it, vi } from 'vitest';

import {
  buildBillingAlertMessage,
  findMissingGrants,
  type PaidSession,
} from '@/lib/billing/reconcile-core';

/**
 * 課金突合の純ロジック（#159 / #156 再発防止）。
 * 「Stripe で paid なのに entitlement が無い」を検知し、自動付与/通知の材料を作る部分を固める。
 */

function session(userId: string, sessionId: string, email: string | null = null): PaidSession {
  return { userId, sessionId, email, customerId: null };
}

describe('findMissingGrants', () => {
  it('全員 entitlement 済みなら未付与は空（＝アラートしない）', async () => {
    const sessions = [session('u1', 'cs_1'), session('u2', 'cs_2')];
    const missing = await findMissingGrants(sessions, async () => true);
    expect(missing).toEqual([]);
  });

  it('entitlement が無いユーザーだけ未付与として返す', async () => {
    const sessions = [session('u1', 'cs_1'), session('u2', 'cs_2')];
    const granted = new Set(['u1']); // u2 は未付与
    const missing = await findMissingGrants(sessions, async (id) => granted.has(id));
    expect(missing.map((s) => s.userId)).toEqual(['u2']);
  });

  it('同一ユーザーの重複セッションは1回だけ判定する', async () => {
    const sessions = [session('u1', 'cs_a'), session('u1', 'cs_b')];
    const check = vi.fn(async () => false);
    const missing = await findMissingGrants(sessions, check);
    expect(check).toHaveBeenCalledTimes(1);
    expect(missing.map((s) => s.sessionId)).toEqual(['cs_a']); // 最初のセッションを代表に
  });

  it('全員未付与なら全件返す（webhook 全滅シナリオ＝#156）', async () => {
    const sessions = [session('a', 'cs_a'), session('b', 'cs_b')];
    const missing = await findMissingGrants(sessions, async () => false);
    expect(missing).toHaveLength(2);
  });
});

describe('buildBillingAlertMessage', () => {
  it('検知件数・自動付与件数・各行のタグを含む', () => {
    const s = session('user_x', 'cs_x', 'a@example.com');
    const msg = buildBillingAlertMessage({ checkedUsers: 3, missing: [s], healed: [s] });
    expect(msg).toContain('検知 1件 / 自動付与 1件');
    expect(msg).toContain('✅自動付与済');
    expect(msg).toContain('user_x');
    expect(msg).toContain('a@example.com');
  });

  it('自動付与できなかったセッションは「未付与のまま」と出る', () => {
    const s = session('user_y', 'cs_y');
    const msg = buildBillingAlertMessage({ checkedUsers: 1, missing: [s], healed: [] });
    expect(msg).toContain('⚠️未付与のまま');
  });

  it('11件以上は先頭10件＋残数を出す', () => {
    const missing = Array.from({ length: 12 }, (_, i) => session(`u${i}`, `cs_${i}`));
    const msg = buildBillingAlertMessage({ checkedUsers: 12, missing, healed: [] });
    expect(msg).toContain('…ほか 2件');
  });
});
