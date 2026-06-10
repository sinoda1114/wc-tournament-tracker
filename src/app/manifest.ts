import type { MetadataRoute } from 'next';

/**
 * PWA Web App Manifest（/manifest.webmanifest として配信）。
 *
 * 方針:
 *  - name / short_name は非公式ファンサイトである実態に沿った一般名称にする
 *    （「FIFA」「ワールドカップ」等の正式名称を商標的に冠さない方針／知財対策）。
 *  - テーマ色はサイトのブランド（濃紺〜ブルー系）に合わせる。
 *  - アイコンは App Router のファイル規約で配信される既存 PNG を参照:
 *      /icon.png         512x512（src/app/icon.png）
 *      /apple-icon.png   180x180（src/app/apple-icon.png）
 *    512 のものを maskable 兼 any として登録する（別途 maskable 専用画像は未用意）。
 *
 * 注意: テーマ色は globals.css（ui-feature 正本）のブランド配色と将来ずれる可能性がある。
 * 厳密な一致が必要になったら globals.css 側の値に合わせて更新すること。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MatchFav — W杯2026 試合・優勝予想・お気に入りトラッカー（非公式）',
    short_name: 'MatchFav',
    description:
      'MatchFav（マッチファボ）は、ワールドカップ2026の日程・結果・優勝予想・お気に入りをひとつにまとめる非公式ファンサイトです（FIFA非公認）。',
    lang: 'ja',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // 濃紺背景にブルー基調。スプラッシュ/テーマともダーク既定に揃える。
    background_color: '#0b1220',
    theme_color: '#1e3a8a',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
