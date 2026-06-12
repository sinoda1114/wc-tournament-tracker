import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_HEADER } from '@/lib/i18n/config';
import { isProtectedRoute } from '@/lib/protected-routes';

/**
 * 認証境界（登録ウォール / T-46）＋ 公開ページのロケール別URL（#19 B-lite）。
 *
 * 方針（プロダクト決定 / T-46。T-44=#42「全公開」を supersede）:
 *   「**一覧・トップは公開 / 詳細・深掘りはログイン必須**」。
 *
 *   公開のまま（撒き餌・入り口・SEO 土台。ブロックしない）:
 *     /, /groups, /groups/[group], /teams(一覧), /matches(一覧/カレンダー),
 *     /prediction, および /en・/es・/pt・/zh 配下の同等ページ。
 *
 *   ログイン必須に変更（登録ウォール。`auth.protect()` で sign-in へ誘導）:
 *     /matches/[id]（試合詳細）, /teams/[code]（チーム詳細）, /rankings（得点王/スタッツ）。
 *     locale 接頭辞付き（/en/matches/[id] 等）も同じく保護＝T-44 で塞いだ
 *     「locale 素通り穴」を再発させない。境界判定は src/lib/protected-routes.ts に集約。
 *
 *   OGP/メタ画像ルート（opengraph-image / twitter-image 等）はクローラのカード生成のため
 *   保護対象外（isProtectedRoute が除外する）。
 *
 *   ★お気に入り・投票は従来どおり各サーバーアクション側で `auth()` により fail-closed
 *   （ページ保護とは別レイヤーのアクションガード。本タスクでは変更しない）:
 *     - 投票:    src/app/prediction/actions.ts（requireVoterId() が null なら拒否）
 *     - お気に入り保存: src/app/favorites/actions.ts（userId 無しは no-op）
 *   /admin ページは従来どおり page 側 `isAdmin()`→`notFound()` で施錠（本タスクで変更しない）。
 *
 * 本 proxy の役割は3つ:
 *   1) Clerk の auth コンテキストを下流（RSC の auth()/currentUser()）へ供給する。
 *   2) 登録ウォール対象（isProtectedRoute）だけ auth.protect() でログインを要求する。
 *   3) ロケール別URL（/en 等）で言語ヘッダ/cookie を注入する。
 *
 * Next.js 16 ではミドルウェアのファイル名が `middleware.ts` → `proxy.ts` に変わった
 * （<=15 は middleware.ts）。本ファイルがその proxy にあたる。
 *
 * 課金壁（T-14）は別レイヤー。ここでは課金を一切混ぜない（純粋にログイン要否のみ）。
 */

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
  // 登録ウォール: 詳細ページ（/matches/[id], /teams/[code], /rankings・locale 接頭辞含む）
  // だけログインを要求する。一覧・トップ・OGP は isProtectedRoute が false を返すので素通り。
  if (isProtectedRoute(req.nextUrl.pathname)) {
    await auth.protect();
  }

  // ロケール別URL（/en 等）は公開ブラウズだが、保護対象詳細（/en/matches/[id] 等）でも
  // 上の protect 通過後にここで言語ヘッダ/cookie を注入したい。よって locale 判定は protect の後。
  const locale = localeFromPath(req.nextUrl.pathname);
  if (!locale) {
    return NextResponse.next();
  }

  // ロケール別URL（/en 等）。x-wc-locale を下流(RSC)へ渡し、cookie に焼いて言語継続。
  const headers = new Headers(req.headers);
  headers.set(LOCALE_HEADER, locale);
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
  });
  return res;
});

export const config = {
  matcher: [
    // _next 内部と、拡張子付き静的ファイル（sitemap.xml / robots.txt / llms.txt /
    // manifest.webmanifest / opengraph-image.png 等）を除外＝これらは常に公開。
    '/((?!_next|.*\\..*).*)',
    // API ルートは常に通す（Clerk auth コンテキスト供給のため）。
    '/(api|trpc)(.*)',
  ],
};
