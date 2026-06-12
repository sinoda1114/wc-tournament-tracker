import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isAdminEmail, isAdminUser } from '@/lib/auth';

/**
 * /admin の施錠（T-44）を担保するユニット。
 *
 * ページ側は `if (!(await isAdmin())) notFound()` で 404 を返す。
 * その心臓部 `isAdminUser` が「匿名」「非adminログイン」の両方で false に
 * なる（＝404 相当になる）こと、所有者のみ true になることを固める。
 * 検証済みメール(verified)＋allowlist 一致のときだけ昇格する fail-closed。
 */

const ORIGINAL_ADMIN_EMAILS = process.env.ADMIN_EMAILS;

type PrimaryEmail = {
  emailAddress: string;
  verification?: { status: string } | null;
};

// isAdminUser が参照する最小形だけを満たすダブル（Clerk User の部分型）。
function fakeUser(primary: PrimaryEmail | null): Parameters<typeof isAdminUser>[0] {
  return { primaryEmailAddress: primary } as unknown as Parameters<typeof isAdminUser>[0];
}

describe('admin 施錠 (isAdminUser / isAdminEmail)', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'owner@example.com, second@example.com';
  });

  afterEach(() => {
    if (ORIGINAL_ADMIN_EMAILS === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = ORIGINAL_ADMIN_EMAILS;
    }
  });

  it('匿名（user=null）は管理者ではない → notFound 相当', () => {
    expect(isAdminUser(null)).toBe(false);
  });

  it('ログイン済みでも allowlist 外なら管理者ではない → notFound 相当', () => {
    const user = fakeUser({
      emailAddress: 'random@example.com',
      verification: { status: 'verified' },
    });
    expect(isAdminUser(user)).toBe(false);
  });

  it('allowlist 一致でもメール未検証なら昇格しない（fail-closed）', () => {
    const user = fakeUser({
      emailAddress: 'owner@example.com',
      verification: { status: 'unverified' },
    });
    expect(isAdminUser(user)).toBe(false);
  });

  it('verification が無い（null/欠落）なら昇格しない', () => {
    expect(isAdminUser(fakeUser({ emailAddress: 'owner@example.com', verification: null }))).toBe(
      false,
    );
    expect(isAdminUser(fakeUser({ emailAddress: 'owner@example.com' }))).toBe(false);
  });

  it('検証済み＋allowlist 一致のときだけ管理者（大文字小文字を無視）', () => {
    expect(
      isAdminUser(
        fakeUser({ emailAddress: 'owner@example.com', verification: { status: 'verified' } }),
      ),
    ).toBe(true);
    expect(
      isAdminUser(
        fakeUser({ emailAddress: 'OWNER@example.com', verification: { status: 'verified' } }),
      ),
    ).toBe(true);
  });

  it('ADMIN_EMAILS 未設定/空なら誰も管理者にならない（fail-closed）', () => {
    process.env.ADMIN_EMAILS = '';
    expect(
      isAdminUser(
        fakeUser({ emailAddress: 'owner@example.com', verification: { status: 'verified' } }),
      ),
    ).toBe(false);
    expect(isAdminEmail('owner@example.com')).toBe(false);
  });

  it('isAdminEmail は allowlist 照合のみ（検証は含まない）', () => {
    expect(isAdminEmail('owner@example.com')).toBe(true);
    expect(isAdminEmail('second@example.com')).toBe(true);
    expect(isAdminEmail('nope@example.com')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
});
