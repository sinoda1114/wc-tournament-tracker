import { cookies } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'wc_admin_session';

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? '';
}

export async function isAdminAuthenticated() {
  const expected = getAdminPassword();

  if (!expected) {
    return false;
  }

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === expected;
}

export function isValidAdminPassword(password: string) {
  const expected = getAdminPassword();
  return Boolean(expected) && password === expected;
}
