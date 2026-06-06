import { ImageResponse } from 'next/og';

import { getTeamSquad } from '@/db/queries';

/**
 * 出場国詳細の動的 OGP 画像（1200x630）。
 *
 * 方針:
 *  - FIFA コードからチーム名（日本語/英語）を引いて大きく描く。
 *  - 国旗絵文字はフォント依存で欠けるため使わず、FIFA コードのバッジ＋チーム名で構成。
 *  - 不正コード・DB 取得失敗時は、コード文字列（または既定文言）でフォールバック描画。
 *  - @libsql/client は Node ランタイム必須なので runtime を明示する。
 */
export const runtime = 'nodejs';

export const alt = '出場国 | WC 2026 決勝トーナメント トラッカー';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ code: string }> };

const BG = '#0b1220';
const ACCENT = '#3b82f6';
const FG = '#f8fafc';
const SUB = '#94a3b8';

export default async function Image({ params }: Props) {
  const { code } = await params;
  const upper = (code ?? '').toUpperCase();

  let nameJa = '';
  let nameEn = '';

  if (/^[A-Za-z]{3}$/.test(code ?? '')) {
    try {
      const squad = await getTeamSquad(upper);
      if (squad) {
        nameJa = squad.team.nameJa;
        nameEn = squad.team.nameEn;
      }
    } catch {
      // DB 未接続等。フォールバックに倒す。
    }
  }

  const title = nameJa || upper || '出場国';

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
          <div style={{ color: SUB, fontSize: 34 }}>出場国 / Squad</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: ACCENT,
                color: '#ffffff',
                fontSize: 44,
                fontWeight: 800,
                padding: '10px 26px',
                borderRadius: 14,
                letterSpacing: 2,
              }}
            >
              {upper || '---'}
            </div>
            <div style={{ color: FG, fontSize: 92, fontWeight: 700, display: 'flex' }}>
              {title}
            </div>
          </div>
          {nameEn ? (
            <div style={{ color: SUB, fontSize: 40, display: 'flex' }}>{nameEn}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ color: FG, fontSize: 36, fontWeight: 600, display: 'flex' }}>
            WC 2026 決勝トーナメント トラッカー
          </div>
          <div style={{ color: SUB, fontSize: 26, display: 'flex' }}>非公式ファンサイト</div>
        </div>
      </div>
    ),
    size,
  );
}
