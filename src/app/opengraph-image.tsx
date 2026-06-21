import { ImageResponse } from 'next/og';

/**
 * サイト共通の OGP 画像（1200x630）。
 *
 * 方針:
 *  - app/opengraph-image.tsx は Next.js が自動で metadata に配線し、専用 OG を
 *    持たない全ルート（トップ含む）へカスケードする。トップに og:image が一切
 *    無い問題（twitter:image も欠落）をこの1ファイルで解消する。
 *  - 専用 OG を持つ /matches/[id] や /teams/[code] は各自の opengraph-image.tsx が
 *    優先されるので、ここは「それ以外の全ページ」のフォールバックとして効く。
 *  - 絵文字・国旗は ImageResponse がシステム絵文字フォントを持たず文字化けするため
 *    使わず、テキストのみで構成する（matches OG と同じ方針）。
 *  - 独自フォントは読み込まず fontFamily:'sans-serif'（matches OG と同一）。
 *  - 配色・余白は matches OG と同じトーンに合わせる（濃紺背景＋ブルーアクセント）。
 *  - 引数なし（ルート直下なので params 不要）。
 */
export const runtime = 'nodejs';

export const alt = 'MatchFav（マッチファボ）— サッカー2026 トラッカー（非公式）';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// ブランド配色（濃紺背景にブルー）。globals.css の正本とは独立した OGP 専用値。
const BG = '#0b1220';
const ACCENT = '#3b82f6';
const FG = '#f8fafc';
const SUB = '#94a3b8';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BG,
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 16, height: 48, background: ACCENT, borderRadius: 4 }} />
          <div style={{ color: SUB, fontSize: 34 }}>ワールドカップ2026 トラッカー</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ color: FG, fontSize: 104, fontWeight: 800, display: 'flex' }}>
            MatchFav
          </div>
          <div style={{ color: SUB, fontSize: 40, fontWeight: 600, display: 'flex' }}>
            マッチファボ
          </div>
          <div style={{ color: FG, fontSize: 36, fontWeight: 600, maxWidth: 960, display: 'flex' }}>
            ワールドカップ2026の日程・結果・優勝予想・お気に入りを、ぜんぶ1か所に。
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ color: FG, fontSize: 36, fontWeight: 600, display: 'flex' }}>
            matchfav.com
          </div>
          <div style={{ color: SUB, fontSize: 26, display: 'flex' }}>
            非公式ファンサイト（FIFA非公認）
          </div>
        </div>
      </div>
    ),
    size,
  );
}
