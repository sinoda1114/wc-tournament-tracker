import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/env';
import { buildAlternates, localeUrl } from '@/lib/i18n/alternates';
import { LOCALES } from '@/lib/i18n/config';

/**
 * サイトマップ。
 *
 * 方針:
 *  - 検索対象にしたい公開ルートのみを列挙する。/admin・/api・法務の特商法（noindex）は除外。
 *  - 試合詳細（/matches/[id]）・出場国詳細（/teams/[code]）・/rankings は T-46 で
 *    登録ウォール（ログイン必須）にしたため掲載しない。公開なのは一覧 /matches・/teams まで。
 *  - グループ詳細 A〜L は公開のまま掲載する。
 *
 * 注意: ベース URL は env 依存。未設定時は lib/env のフォールバックになるため、
 * 独自ドメイン確定後は NEXT_PUBLIC_SITE_URL を設定すること。
 */

// DB 依存を外したが、now を毎回反映するため動的のまま（再生成は無害・低コスト）。
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

  // 公開トップは #19 でロケール別URL（ja=`/`・en/es/pt/zh=`/<loc>`）を持つ。各エントリに
  // hreflang(alternates) を付与して相互リンクにする（Google 推奨の reciprocal 形式）。
  const homeLanguages = buildAlternates('home', 'ja').languages;
  const homeEntries: MetadataRoute.Sitemap = LOCALES.map((locale) => ({
    url: localeUrl('home', locale),
    lastModified: now,
    changeFrequency: 'hourly',
    priority: locale === 'ja' ? 1 : 0.9,
    alternates: { languages: homeLanguages },
  }));

  // その他の主要一覧ページ（常に存在）。
  const staticEntries: MetadataRoute.Sitemap = [
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

  // 試合詳細（/matches/[id]）・出場国詳細（/teams/[code]）は T-46 で登録ウォール
  // （ログイン必須）にしたため sitemap から除外する。匿名クローラはこれらに到達しても
  // sign-in に飛ぶので、インデックスさせない（公開なのは一覧 /matches・/teams まで）。
  // /rankings も保護対象だが元々 sitemap に未掲載のため追記不要。

  return [...homeEntries, ...staticEntries, ...groupEntries];
}
