/**
 * 公開ルート（未ログインでアクセス可）の単一情報源。
 *
 * 認証導入(#13)時に Clerk の `clerkMiddleware` + `createRouteMatcher` がこの定義を消費し、
 * 「公開ルート以外はログイン必須」の二層設計を実現する。現状は認証が無く全ルート公開だが、
 * SEO / シェア(OGP) で確実にクロール・プレビューさせたい公開面をここで先に確定しておく
 * （認証本体は後回しでも公開側の契約は先行できる）。
 *
 * 判定は pathname（クエリ・末尾スラッシュ無視）に対する完全一致/プレフィックス一致で行う。
 */

/** 完全一致で公開するルート。 */
const EXACT_PUBLIC: ReadonlySet<string> = new Set([
  '/', // ランディング/トップ（決勝トーナメント表）
  '/groups',
  '/teams',
  '/prediction',
  '/favorites',
  // 法務（route group (legal) は URL に出ない）
  '/terms',
  '/privacy',
  '/tokushoho',
  // 認証導入後のサインイン/アップ（先取り。catch-all はプレフィックス側でも許可）
  '/sign-in',
  '/sign-up',
  // SEO / PWA 静的
  '/sitemap.xml',
  '/robots.txt',
  '/manifest.webmanifest',
  '/llms.txt',
  '/icon.png',
  '/apple-icon.png',
]);

/** 前方一致で公開するプレフィックス（動的セグメント配下を含む）。 */
const PREFIX_PUBLIC: readonly string[] = [
  '/groups/', // /groups/a
  '/teams/', // /teams/jpn, /teams/jpn/opengraph-image
  '/matches/', // /matches/51, /matches/51/opengraph-image
  '/sign-in/', // Clerk catch-all
  '/sign-up/',
];

/** 独自に認証/署名検証を持つため、ログイン保護の対象外にする公開 API。 */
const PUBLIC_API: readonly string[] = [
  '/api/ingest', // CRON_SECRET Bearer で別途保護
  '/api/stripe/webhook', // Stripe 署名検証で別途保護（#14 で実装予定）
];

/** pathname を正規化する（クエリ除去・末尾スラッシュ除去・空なら '/'）。 */
function normalizePath(pathname: string): string {
  const path = pathname.split('?')[0].replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

/**
 * 与えられた pathname が公開ルートか。
 * #13 の Clerk middleware は「`!isPublicRoute(...)` なら `auth().protect()`」の形で使う想定。
 */
export function isPublicRoute(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (EXACT_PUBLIC.has(path)) return true;
  if (PUBLIC_API.some((api) => path === api || path.startsWith(`${api}/`))) return true;
  return PREFIX_PUBLIC.some((prefix) => path.startsWith(prefix));
}

/**
 * Clerk の `createRouteMatcher` に渡す用のグロブ配列（#13 で利用）。
 * {@link isPublicRoute} と同じ範囲を Clerk のパスパターン記法で表したもの。
 */
export const PUBLIC_ROUTE_GLOBS: readonly string[] = [
  '/',
  '/groups',
  '/groups/(.*)',
  '/teams',
  '/teams/(.*)',
  '/matches/(.*)',
  '/prediction',
  '/favorites',
  '/terms',
  '/privacy',
  '/tokushoho',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sitemap.xml',
  '/robots.txt',
  '/manifest.webmanifest',
  '/llms.txt',
  '/icon.png',
  '/apple-icon.png',
  '/api/ingest',
  '/api/stripe/webhook',
];
