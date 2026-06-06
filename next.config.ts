import type { NextConfig } from 'next';

/**
 * Content-Security-Policy（まずは Report-Only で導入）。
 * Mantine / Next は inline の style / script（ColorSchemeScript 等）を使うため、
 * script/style に `'unsafe-inline'` を許可する。Report-Only なのでブロックはせず、
 * 違反はブラウザに報告されるだけ。プレビューで違反が無いことを確認してから、
 * ヘッダ名を `Content-Security-Policy`（enforce）に切り替える想定。
 * 真の厳格化（nonce 方式で 'unsafe-inline' を外す）は #8 のフォローアップ。
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'", // Next/Mantine の inline bootstrap
  "style-src 'self' 'unsafe-inline'", // Mantine の inline style
  "img-src 'self' data: blob: https:", // flag-icons(SVG/data)・OGP・https 画像
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join('; ');

/** 全レスポンスに付与するセキュリティヘッダ。 */
const securityHeaders = [
  // MIME スニッフィング抑止。
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // クリックジャッキング対策（自サイト内のみ iframe 許可）。
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // リファラは同一オリジンには full、クロスオリジンには origin のみ。
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // HTTPS 強制（Vercel 本番は HTTPS）。2年・サブドメイン込み・preload 申請可。
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // 不要な強力機能を既定で無効化。
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  // CSP は安全側の Report-Only から（違反を観測してから enforce に切替）。
  { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // 全ルートに適用（静的アセット含む）。
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
