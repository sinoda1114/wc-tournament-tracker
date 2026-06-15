'use client';

import { CountryFlag } from '@/components/CountryFlag';
import type { MatchLineup, PitchPlayer } from '@/lib/lineup/wikipedia-lineup';

type MatchPitchProps = {
  lineup: MatchLineup;
  home: { name: string; fifaCode: string };
  away: { name: string; fifaCode: string };
};

function Chip({
  player,
  topPct,
  color,
  textColor,
}: {
  player: PitchPlayer;
  topPct: number;
  color: string;
  textColor: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${player.x * 100}%`,
        top: `${topPct}%`,
        transform: 'translate(-50%, -50%)',
        width: 84,
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          margin: '0 auto 2px',
          borderRadius: '50%',
          background: color,
          color: textColor,
          fontSize: 12,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {player.number ?? '—'}
      </div>
      <div
        style={{
          fontSize: 10,
          lineHeight: 1.15,
          color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,0.7)',
          overflowWrap: 'break-word',
        }}
        title={player.name}
      >
        {player.name}
      </div>
    </div>
  );
}

/**
 * T-87 フェーズ1: 1枚の縦ピッチに両チームの先発XIを上下対面で配置する。
 * 上=ホーム（自陣=最上段にGK→前線が中央寄り）、下=アウェイ（上下反転）。
 * プロトタイプのためインラインスタイル（globals.css 不可侵・切り戻し容易）。
 */
export function MatchPitch({ lineup, home, away }: MatchPitchProps) {
  const HOME_COLOR = '#EF9F27';
  const HOME_TEXT = '#412402';
  const AWAY_COLOR = '#185FA5';
  const AWAY_TEXT = '#fff';

  return (
    <div style={{ width: '100%', maxWidth: 460, margin: '0 auto 24px' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3 / 4',
          background: '#2f7d32',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '2px solid rgba(255,255,255,0.30)' }} />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '26%',
            aspectRatio: '1 / 1',
            transform: 'translate(-50%,-50%)',
            border: '2px solid rgba(255,255,255,0.30)',
            borderRadius: '50%',
          }}
        />
        <div style={{ position: 'absolute', left: '25%', right: '25%', top: 0, height: '12%', border: '2px solid rgba(255,255,255,0.25)', borderTop: 0 }} />
        <div style={{ position: 'absolute', left: '25%', right: '25%', bottom: 0, height: '12%', border: '2px solid rgba(255,255,255,0.25)', borderBottom: 0 }} />

        <div style={{ position: 'absolute', top: 6, left: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CountryFlag fifaCode={home.fifaCode} size="sm" ariaLabel={home.name} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>{home.name}</span>
        </div>
        <div style={{ position: 'absolute', bottom: 6, left: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CountryFlag fifaCode={away.fifaCode} size="sm" ariaLabel={away.name} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>{away.name}</span>
        </div>

        {/* 上=ホーム: y(0=GK..1=前線) → 画面上 2%..48% */}
        {lineup.home.map((p) => (
          <Chip key={`h-${p.number}-${p.name}`} player={p} topPct={2 + p.y * 46} color={HOME_COLOR} textColor={HOME_TEXT} />
        ))}
        {/* 下=アウェイ: 反転 98%..52% */}
        {lineup.away.map((p) => (
          <Chip key={`a-${p.number}-${p.name}`} player={p} topPct={98 - p.y * 46} color={AWAY_COLOR} textColor={AWAY_TEXT} />
        ))}
      </div>
    </div>
  );
}
