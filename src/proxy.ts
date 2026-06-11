import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_HEADER } from '@/lib/i18n/config';

/**
 * ログイン必須化（案A: トップ公開・登録誘導型）＋ 公開ページのロケール別URL（#19 B-lite）。
 *
 * Next.js 16 ではミドルウェアのファイル名が `middleware.ts` → `proxy.ts` に変わった
 * （<=15 は middleware.ts）。本ファイルがその proxy にあたる。
 *
 * 下記の「公開ルート」だけがログイン不要。それ以外
 * （groups / teams / matches / prediction / favorites / admin など）は `auth.protect()` で
 * 未ログイン時に sign-in へ誘導する。
 *
 * 加えて、先頭セグメントが対応ロケール（en/es/pt/zh。ja は既定でプレフィックス無し）の
 * パス（/en, /en/... 等）は **公開**扱いとし、
 *  - リクエストヘッダ `x-wc-locale=<loc>` を付与（root layout / resolveLocale が読む）
 *  - レスポンス cookie `wc_locale=<loc>` を焼く（以降の内部ページ遷移も同じ言語で継続）
 * を行う。Clerk の auth コンテキストは `NextResponse.next({ request: { headers } })` を返す
 * 公式パターンで保持される（auth() / currentUser() は下流で従来どおり機能する）。
 */
const isPublicRoute = createRouteMatcher([
  '/', // トップ（公開ランディング。機能利用時にログインを要求する）
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/privacy(.*)', // (legal) — 特商法・プライバシー等は未ログイン閲覧が前提
  '/terms(.*)',
  '/tokushoho(.*)',
  '/api/ingest', // CRON_SECRET で fail-closed 済み（route.ts）。Clerk 判定はバイパス
  '/api/webhooks(.*)', // Clerk/Stripe webhook（署名検証で保護）。将来用に先行開放
]);

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * パスの先頭セグメントが「ロケール別URLのロケール」なら返す（en/es/pt/zh）。
 * 既定の ja はプレフィックス無し（`/`）なので対象外＝`/ja` はロケール扱いしない。
 */
function localeFromPath(pathname: string): string | null {
  const seg = pathname.split('/')[1] ?? '';
  return isLocale(seg) && seg !== DEFAULT_LOCALE ? seg : null;
}

export default clerkMiddleware(async (auth, req) => {
  const locale = localeFromPath(req.nextUrl.pathname);

  if (locale) {
    // ロケール別URL（/en 等）は公開。x-wc-locale を下流(RSC)へ渡し、cookie に焼いて言語継続。
    const headers = new Headers(req.headers);
    headers.set(LOCALE_HEADER, locale);
    const res = NextResponse.next({ request: { headers } });
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: ONE_YEAR,
      sameSite: 'lax',
    });
    return res;
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // _next 内部と、拡張子付き静的ファイル（sitemap.xml / robots.txt / llms.txt /
    // manifest.webmanifest / opengraph-image.png 等）を除外＝これらは常に公開。
    '/((?!_next|.*\\..*).*)',
    // API ルートは常に通す（ingest / webhooks は上の公開判定でバイパスされる）。
    '/(api|trpc)(.*)',
  ],
};
