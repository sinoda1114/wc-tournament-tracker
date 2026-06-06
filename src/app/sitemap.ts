import type { MetadataRoute } from 'next';

import { listAllTeams, listTournamentMatches } from '@/db/queries';
import { getSiteUrl } from '@/lib/env';

/**
 * サイトマップ（動的生成）。
 *
 * 方針:
 *  - 検索対象にしたい公開ルートのみを列挙する。/admin・/api・法務の特商法（noindex）は除外。
 *  - 試合詳細・出場国・グループ詳細は DB から実在する分だけ列挙し、404 を載せない。
 *  - DB 取得に失敗しても sitemap 全体が 500 にならないよう、動的部分は握りつぶして
 *    静的ルートだけは必ず返す（クローラに最低限のエントリは見せる）。
 *  - lastModified は試合の updated_at（結果反映で変わる）を反映し、再クロールを促す。
 *
 * 注意: ベース URL は env 依存。未設定時は lib/env のフォールバックになるため、
 * 独自ドメイン確定後は NEXT_PUBLIC_SITE_URL を設定すること。
 */

// 試合結果が入るたび lastModified を更新したいので毎回再生成（キャッシュしない）。
export const dynamic = 'force-dynamic';

const GROUP_LETTERS = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  // 公開トップ・主要一覧ページ（常に存在）。
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/groups`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/teams`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    {
      url: `${base}/prediction`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${base}/favorites`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    // 法務（特商法 tokushoho は noindex のため意図的に除外）。
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  // グループ詳細 A〜L は固定（DB に依存せず常に 12 本）。
  const groupEntries: MetadataRoute.Sitemap = GROUP_LETTERS.map((letter) => ({
    url: `${base}/groups/${letter}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  // 試合詳細・出場国詳細は DB から実在分だけ。失敗時は静的分のみ返す。
  let dynamicEntries: MetadataRoute.Sitemap = [];
  try {
    const [matches, teams] = await Promise.all([
      listTournamentMatches(),
      listAllTeams(),
    ]);

    const matchEntries: MetadataRoute.Sitemap = matches.map((m) => ({
      url: `${base}/matches/${m.id}`,
      // 試合結果が更新されると updatedAt が動くので再クロールを促せる。
      lastModified: m.updatedAt ? new Date(m.updatedAt) : now,
      changeFrequency: 'daily',
      priority: 0.5,
    }));

    const teamEntries: MetadataRoute.Sitemap = teams.map((t) => ({
      url: `${base}/teams/${t.fifaCode.toLowerCase()}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    }));

    dynamicEntries = [...matchEntries, ...teamEntries];
  } catch {
    // DB 未接続（env 未設定）等。静的ルートだけでも返してクロール可能にする。
    dynamicEntries = [];
  }

  return [...staticEntries, ...groupEntries, ...dynamicEntries];
}
