'use client';

import { useState } from 'react';

import type { MatchDetail } from '@/db/queries';

import { BracketLayout } from './BracketLayout';
import { TournamentBracket } from './TournamentBracket';

type ViewMode = 'bracket' | 'cards';

type TournamentViewToggleProps = {
  matches: MatchDetail[];
};

export function TournamentViewToggle({ matches }: TournamentViewToggleProps) {
  const [mode, setMode] = useState<ViewMode>('bracket');

  return (
    <div>
      <div className="wc-tournament-toolbar">
        <div className="wc-view-toggle" role="tablist" aria-label="表示切替">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'bracket'}
            className={mode === 'bracket' ? 'is-active' : ''}
            onClick={() => setMode('bracket')}
          >
            ブラケット
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'cards'}
            className={mode === 'cards' ? 'is-active' : ''}
            onClick={() => setMode('cards')}
          >
            カード
          </button>
        </div>
      </div>
      {mode === 'bracket' ? (
        <BracketLayout matches={matches} />
      ) : (
        <TournamentBracket matches={matches} />
      )}
    </div>
  );
}
