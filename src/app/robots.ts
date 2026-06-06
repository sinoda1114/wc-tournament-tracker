import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/env';

/**
 * robots.txt（動的生成）。
 *
 * 方針:
 *  - 公開コンテンツは全面クロール許可。
 *  - 非公開・インデックス不要な領域は disallow:
 *      /admin          管理 UI（認証必須）
 *      /api            内部 API（/api/ingest 等）
 *      /tokushoho      特商法表記は準備中で noindex 指定済み（方針整合のため二重に弾く）
 *  - sitemap と host を明示し、クローラに正準ドメインを伝える。
 *
 * 注意: 特商法ページは課金実装時に index 解禁する予定。その際は本 disallow と
 * tokushoho/page.tsx の robots 指定を併せて見直すこと。
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/tokushoho'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
