import { describe, expect, it } from 'vitest';

import {
  evaluateEntitlement,
  graceWindow,
  isBeforeKnockout,
  GRACE_PERIOD_MS,
} from '@/lib/billing/entitlement';
import { KNOCKOUT_START_UTC } from '@/lib/pricing';

// 境界（決勝T開始 = 6/29 00:00 JST = 6/28 15:00Z）。
const KNOCKOUT = KNOCKOUT_START_UTC;
const beforeKnockout = new Date('2026-06-20T00:00:00Z'); // グループ期間中
const atKnockout = new Date(KNOCKOUT); // 境界ちょうど
const afterKnockout = new Date('2026-07-01T00:00:00Z'); // 決勝T期間中

describe('isBeforeKnockout', () => {
  it('境界の1ミリ秒前は無料期間', () => {
    expect(isBeforeKnockout(new Date(KNOCKOUT - 1))).toBe(true);
  });
  it('境界ちょうどは無料期間ではない', () => {
    expect(isBeforeKnockout(atKnockout)).toBe(false);
  });
});

describe('graceWindow（72h 遅参救済）', () => {
  it('未ログイン(null)は救済対象外', () => {
    expect(graceWindow(null, afterKnockout)).toBeNull();
  });

  it('決勝T開始前に登録した人は救済対象外（無料期間を使えている）', () => {
    const registeredBefore = KNOCKOUT - 1000;
    expect(graceWindow(registeredBefore, afterKnockout)).toBeNull();
  });

  it('決勝T開始ちょうどに登録 → 72h 後の終了時刻を返す', () => {
    const end = graceWindow(KNOCKOUT, new Date(KNOCKOUT + 1000));
    expect(end).toBe(KNOCKOUT + GRACE_PERIOD_MS);
  });

  it('登録から 72h を1ミリ秒でも過ぎたら救済切れ(null)', () => {
    const registered = KNOCKOUT + 10_000;
    const justExpired = new Date(registered + GRACE_PERIOD_MS); // ちょうど 72h（含まない）
    expect(graceWindow(registered, justExpired)).toBeNull();
    const oneMsBefore = new Date(registered + GRACE_PERIOD_MS - 1);
    expect(graceWindow(registered, oneMsBefore)).toBe(registered + GRACE_PERIOD_MS);
  });
});

describe('evaluateEntitlement', () => {
  it('決勝T開始前は全員アクセス可（free_period）', () => {
    const result = evaluateEntitlement({
      now: beforeKnockout,
      purchased: false,
      clerkCreatedAtMs: null,
    });
    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe('free_period');
  });

  it('決勝T後・購入済みは恒久解放（purchased）', () => {
    const result = evaluateEntitlement({
      now: afterKnockout,
      purchased: true,
      clerkCreatedAtMs: new Date('2026-06-01T00:00:00Z').getTime(),
    });
    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe('purchased');
  });

  it('決勝T後・未購入・決勝T開始後に新規登録して 72h 以内は救済(grace)', () => {
    const registered = KNOCKOUT + 60_000; // 決勝T開始の1分後に登録
    const now = new Date(registered + 60 * 60 * 1000); // 登録1時間後
    const result = evaluateEntitlement({
      now,
      purchased: false,
      clerkCreatedAtMs: registered,
    });
    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe('grace');
    expect(result.graceEndsAtMs).toBe(registered + GRACE_PERIOD_MS);
  });

  it('決勝T後・未購入・救済切れは課金壁(locked)', () => {
    const registered = KNOCKOUT + 60_000;
    const now = new Date(registered + GRACE_PERIOD_MS + 1); // 72h 経過後
    const result = evaluateEntitlement({
      now,
      purchased: false,
      clerkCreatedAtMs: registered,
    });
    expect(result.hasAccess).toBe(false);
    expect(result.reason).toBe('locked');
  });

  it('決勝T後・未購入・グループ期間中に登録した既存ユーザーは課金壁(locked)', () => {
    const result = evaluateEntitlement({
      now: afterKnockout,
      purchased: false,
      clerkCreatedAtMs: new Date('2026-06-15T00:00:00Z').getTime(),
    });
    expect(result.hasAccess).toBe(false);
    expect(result.reason).toBe('locked');
  });

  it('決勝T後・未ログイン(null)は課金壁(locked)', () => {
    const result = evaluateEntitlement({
      now: afterKnockout,
      purchased: false,
      clerkCreatedAtMs: null,
    });
    expect(result.hasAccess).toBe(false);
    expect(result.reason).toBe('locked');
  });

  it('購入済みでも無料期間中は free_period が優先（バナー非表示判定に使う）', () => {
    const result = evaluateEntitlement({
      now: beforeKnockout,
      purchased: true,
      clerkCreatedAtMs: null,
    });
    expect(result.reason).toBe('free_period');
    expect(result.hasAccess).toBe(true);
  });
});
