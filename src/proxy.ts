import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * ログイン必須化（案A: トップ公開・登録誘導型）。
 *
 * Next.js 16 ではミドルウェアのファイル名が `middleware.ts` → `proxy.ts` に変わった
 * （<=15 は middleware.ts）。本ファイルがその proxy にあたる。
 *
 * 下記の「公開ルート」だけがログイン不要。それ以外
 * （groups / teams / matches / prediction / favorites / admin など）は `auth.protect()` で
 * 未ログイン時に sign-in へ誘導する。
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

export default clerkMiddleware(async (auth, req) => {
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
