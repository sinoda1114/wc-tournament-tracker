import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { isAdmin, isAdminEmail } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * ⚠️ 一時的な診断エンドポイント（/admin 404 の原因切り分け用）。
 * 呼び出した本人のセッション情報だけを返す（他人の情報は含まない）。
 * 原因確定後に削除する。
 */
export async function GET() {
  const user = await currentUser();
  const primary = user?.primaryEmailAddress ?? null;

  return NextResponse.json({
    note: 'TEMPORARY diagnostic. Returns only YOUR own session. Will be removed after diagnosis.',
    hasUser: Boolean(user),
    primaryEmail: primary?.emailAddress ?? null,
    primaryVerificationStatus: primary?.verification?.status ?? null,
    emails: (user?.emailAddresses ?? []).map((e) => ({
      email: e.emailAddress,
      status: e.verification?.status ?? null,
    })),
    isAdminEmailForPrimary: isAdminEmail(primary?.emailAddress ?? null),
    isAdmin: await isAdmin(),
    adminEmailsConfiguredCount: (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean).length,
  });
}
