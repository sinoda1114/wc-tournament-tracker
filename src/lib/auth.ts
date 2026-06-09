import { currentUser } from '@clerk/nextjs/server';

type ClerkUser = Awaited<ReturnType<typeof currentUser>>;

/**
 * 管理者として許可するメールアドレス（環境変数 ADMIN_EMAILS・カンマ区切り）。
 * 小文字化・トリム済み。未設定（空）なら誰も管理者にならない（fail-closed）。
 */
function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * 渡されたメールが管理者 allowlist に含まれるか（純粋な文字列照合）。
 * 検証済み判定は含まないので、権限境界では {@link isAdminUser} を使うこと。
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const allow = getAdminEmails();
  if (allow.length === 0 || !email) {
    return false;
  }
  return allow.includes(email.toLowerCase());
}

/**
 * Clerk ユーザーが管理者か。プライマリメールが **検証済み(verified)** かつ
 * allowlist 一致のときだけ true。未検証メールでの権限昇格を防ぐ（fail-closed）。
 */
export function isAdminUser(user: ClerkUser): boolean {
  const primary = user?.primaryEmailAddress;
  if (!primary || primary.verification?.status !== 'verified') {
    return false;
  }
  return isAdminEmail(primary.emailAddress);
}

/**
 * ログイン中の Clerk ユーザーが管理者か。
 * 管理ページ・サーバーアクションのゲートに使う（所有者のみ＝オーナー限定）。
 */
export async function isAdmin(): Promise<boolean> {
  return isAdminUser(await currentUser());
}
