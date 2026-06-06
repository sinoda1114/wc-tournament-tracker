import type { NextConfig } from 'next';

/**
 * 全レスポンスに付与するセキュリティヘッダ。
 * 注: Content-Security-Policy は Mantine / Next の inline style・script と相性があり、
 * 厳格に入れると壊れやすいため本タスクでは見送り（#8 残: nonce 方式 or report-only で別途）。
 */
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
