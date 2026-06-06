import { describe, expect, it } from 'vitest';

import { isPublicRoute, PUBLIC_ROUTE_GLOBS } from '@/lib/public-routes';

describe('isPublicRoute', () => {
  it('トップ・一覧・予想・お気に入りは公開', () => {
    for (const p of ['/', '/groups', '/teams', '/prediction', '/favorites']) {
      expect(isPublicRoute(p)).toBe(true);
    }
  });

  it('動的詳細（グループ/出場国/試合・OGP含む）は公開', () => {
    expect(isPublicRoute('/groups/a')).toBe(true);
    expect(isPublicRoute('/teams/jpn')).toBe(true);
    expect(isPublicRoute('/teams/jpn/opengraph-image')).toBe(true);
    expect(isPublicRoute('/matches/51')).toBe(true);
    expect(isPublicRoute('/matches/51/opengraph-image')).toBe(true);
  });

  it('法務・SEO/PWA静的は公開', () => {
    for (const p of [
      '/terms', '/privacy', '/tokushoho',
      '/sitemap.xml', '/robots.txt', '/manifest.webmanifest', '/llms.txt',
      '/icon.png', '/apple-icon.png',
    ]) {
      expect(isPublicRoute(p)).toBe(true);
    }
  });

  it('独自に認証を持つ公開APIは保護対象外（公開扱い）', () => {
    expect(isPublicRoute('/api/ingest')).toBe(true);
    expect(isPublicRoute('/api/stripe/webhook')).toBe(true);
  });

  it('sign-in/up は catch-all 配下も公開', () => {
    expect(isPublicRoute('/sign-in')).toBe(true);
    expect(isPublicRoute('/sign-in/factor-one')).toBe(true);
    expect(isPublicRoute('/sign-up')).toBe(true);
  });

  it('admin と未知ルートは非公開（将来ログイン必須）', () => {
    expect(isPublicRoute('/admin')).toBe(false);
    expect(isPublicRoute('/admin/login')).toBe(false);
    expect(isPublicRoute('/admin/matches/5')).toBe(false);
    expect(isPublicRoute('/account')).toBe(false);
    expect(isPublicRoute('/api/secret')).toBe(false);
  });

  it('末尾スラッシュ・クエリ・空文字を正規化', () => {
    expect(isPublicRoute('/groups/')).toBe(true);
    expect(isPublicRoute('/teams?q=1')).toBe(true);
    expect(isPublicRoute('')).toBe(true); // '' -> '/'
  });

  it('PUBLIC_ROUTE_GLOBS は #13 Clerk 用に空でない', () => {
    expect(PUBLIC_ROUTE_GLOBS.length).toBeGreaterThan(0);
  });
});
