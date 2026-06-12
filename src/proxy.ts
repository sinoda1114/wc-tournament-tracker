import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_HEADER } from '@/lib/i18n/config';

/**
 * 認証境界（案A: 公開ブラウズ）＋ 公開ページのロケール別URL（#19 B-lite）。
 *
 * 方針（プロダクト決定 / T-44）:
 *   「**閲覧は全公開 / アクション（★お気に入り・投票）だけ要ログイン**」。
 *   ページの閲覧（/, /groups, /teams, /matches, /prediction, /admin, および
 *   /en・/es・/pt・/zh 配下）は**一切ログインを要求しない**。
 *   保護すべきは "ページ" ではなく "行動" なので、ログイン必須化は各サーバーアクション側で
 *   `auth()` により fail-closed に行う:
 *     - 投票:    src/app/prediction/actions.ts（requireVoterId() が null なら拒否）
 *     - お気に入り保存: src/app/favorites/actions.ts（userId 無しは no-op。匿名は localStorage で動く）
 *     - 管理操作: src/app/admin/actions.ts（isAdmin() ガード）
 *   /admin ページ自体は page 側の `isAdmin()`→`notFound()` で匿名・非adminともに 404。
 *
 * したがって本 proxy は **どのページもブロックしない**。役割は2つだけ:
 *   1) Clerk の auth コンテキストを下流（RSC の auth()/currentUser()）へ供給する。
 *   2) ロケール別URL（/en 等）で言語ヘッダ/cookie を注入する。
 *
 * Next.js 16 ではミドルウェアのファイル名が `middleware.ts` → `proxy.ts` に変わった
 * （<=15 は middleware.ts）。本ファイルがその proxy にあたる。
 *
 * 補足: auth.protect() を全面適用していた旧版は「公開以外は sign-in へ誘導」する案B
 * （全ページログイン必須）だったが、本番では実質効かず全公開になっていた。本タスクで
 * それを「意図した案A（公開ブラウズ）」へ正す。locale 早期 return で保護を素通りする
 * 旧来の穴も、全ページ公開に統一したことで解消している（保護経路自体を持たない）。
 *
 * 将来 Stripe 課金壁（T-14）でアクセス制御を足す場合も、ページ全面ブロックではなく
 * 対象アクション/対象ルートに限定したガードを「追加」する形にすること（本 proxy の
 * 公開ブラウズ前提を崩さない）。
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

export default clerkMiddleware(async (_auth, req) => {
  // 公開ブラウズ: どのページも auth.protect() でブロックしない。
  // ログイン必須化は各サーバーアクション（投票/お気に入り/管理操作）側で fail-closed に行う。
  const locale = localeFromPath(req.nextUrl.pathname);
  if (!locale) {
    return NextResponse.next();
  }

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
