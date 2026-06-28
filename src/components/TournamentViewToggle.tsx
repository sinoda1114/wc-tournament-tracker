'use client';

import dynamic from 'next/dynamic';
import { useState, type ReactNode } from 'react';

import type { MatchDetail } from '@/db/queries';
import { useDictionary } from '@/lib/i18n/context';

import { BracketLayout } from './BracketLayout';
import { TournamentBracket } from './TournamentBracket';

// Three.jsを初期バンドルから切り離す。3Dタブを押した時だけロード。
const BracketLayout3D = dynamic(
  () => import('./BracketLayout3D').then((m) => ({ default: m.BracketLayout3D })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: '70vh',
          background: '#04060d',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7f93ad',
          fontSize: '0.9rem',
        }}
      >
        3Dシーンを読み込み中…
      </div>
    ),
  },
);

type ViewMode = 'bracket' | 'cards' | '3d';

type TournamentViewToggleProps = {
  matches: MatchDetail[];
  /**
   * カード表示（cards）が決勝T課金壁のとき、カード本体の代わりに描画するロック要素。
   * サーバ側で生成した <PaywallLock /> を渡す（T-68 面①）。ブラケット表示は常に無料。
   */
  cardLock?: ReactNode;
};

export function TournamentViewToggle({ matches, cardLock }: TournamentViewToggleProps) {
  const [mode, setMode] = useState<ViewMode>('bracket');
  const t = useDictionary().tournament;

  return (
    <div>
      <div className="wc-tournament-toolbar">
        <div className="wc-view-toggle" role="tablist" aria-label={t.viewLabel}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'bracket'}
            className={mode === 'bracket' ? 'is-active' : ''}
            onClick={() => setMode('bracket')}
          >
            {t.bracket}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'cards'}
            className={mode === 'cards' ? 'is-active' : ''}
            onClick={() => setMode('cards')}
          >
            {t.cards}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === '3d'}
            className={mode === '3d' ? 'is-active' : ''}
            onClick={() => setMode('3d')}
          >
            {t.view3d}
          </button>
        </div>
      </div>
      {mode === 'bracket' ? (
        <BracketLayout matches={matches} />
      ) : mode === '3d' ? (
        <BracketLayout3D matches={matches} />
      ) : cardLock ? (
        cardLock
      ) : (
        <TournamentBracket matches={matches} />
      )}
    </div>
  );
}
