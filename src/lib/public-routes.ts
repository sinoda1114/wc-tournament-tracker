/**
 * 公開ルート（未ログインでアクセス可）の単一情報源。
 *
 * 【現状の方針 / T-44】プロダクトは「案A: 公開ブラウズ」を採用した
 * （閲覧は全公開 / アクションだけ要ログイン）。そのため src/proxy.ts は
 * ページを一切ブロックせず、**このモジュールには依存していない**。
 * ＝ ここで `false` を返すルート（/admin 等）も proxy では保護されない。
 * /admin は page 側の `isAdmin()`→`notFound()` で施錠し、各サーバーアクションは
 * 各自 `auth()` で fail-closed にする（保護は "ページ" でなく "行動" 単位）。
 *
 * 本モジュールは「どこが公開面か」の宣言的カタログとして残す（SEO/OGP のクロール対象や、
 * 将来の課金壁(T-14)で "特定ルートだけ要ログイン" を足す際の参照点）。
 * proxy で全面保護を復活させる用途に **再利用しないこと**（公開ブラウズ前提を崩す）。
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
  '/api/ingest(.*)',
  '/api/stripe/webhook',
];
