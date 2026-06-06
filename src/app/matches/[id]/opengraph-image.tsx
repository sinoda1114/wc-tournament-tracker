import { ImageResponse } from 'next/og';

import { getMatchDetail } from '@/db/queries';
import { getParticipantLabel, STAGE_LABELS, type MatchStage } from '@/lib/bracket';

/**
 * 試合詳細の動的 OGP 画像（1200x630）。
 *
 * 方針:
 *  - DB から対戦カード・ステージを引いて「ホーム vs アウェイ」を描く。
 *  - 国旗は絵文字だとフォント依存で文字化け/欠落しやすいので使わず、チーム名＋FIFAコードの
 *    テキストで構成する（ImageResponse はシステム絵文字フォントを持たない）。
 *  - DB 取得失敗・未確定カードでもクラッシュさせず、サイト名のフォールバック画像を返す。
 *  - @libsql/client は Node ランタイム必須（Edge 非対応）なので runtime を明示する。
 */
export const runtime = 'nodejs';

export const alt = '試合詳細 | WC 2026 決勝トーナメント トラッカー';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ id: string }> };

// ブランド配色（濃紺背景にブルー）。globals.css の正本とは独立した OGP 専用値。
const BG = '#0b1220';
const ACCENT = '#3b82f6';
const FG = '#f8fafc';
const SUB = '#94a3b8';

export default async function Image({ params }: Props) {
  const { id } = await params;
  const matchId = Number(id);

  let stageLabel = '';
  let homeLabel = '';
  let awayLabel = '';

  if (Number.isInteger(matchId)) {
    try {
      const match = await getMatchDetail(matchId);
      if (match) {
        stageLabel = STAGE_LABELS[match.stage as MatchStage] ?? match.stage;
        homeLabel = getParticipantLabel(match.homeTeam, match.homeSlot);
        awayLabel = getParticipantLabel(match.awayTeam, match.awaySlot);
      }
    } catch {
      // DB 未接続等。フォールバック描画に倒す。
    }
  }

  const hasCard = Boolean(homeLabel && awayLabel);

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
          <div style={{ color: SUB, fontSize: 34 }}>
            {stageLabel || 'WC 2026 決勝トーナメント'}
          </div>
        </div>

        {hasCard ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 40,
            }}
          >
            <div style={{ color: FG, fontSize: 76, fontWeight: 700, maxWidth: 460, display: 'flex' }}>
              {homeLabel}
            </div>
            <div style={{ color: ACCENT, fontSize: 64, fontWeight: 800, display: 'flex' }}>vs</div>
            <div style={{ color: FG, fontSize: 76, fontWeight: 700, maxWidth: 460, display: 'flex' }}>
              {awayLabel}
            </div>
          </div>
        ) : (
          <div style={{ color: FG, fontSize: 72, fontWeight: 700, display: 'flex' }}>
            試合詳細
          </div>
        )}

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
