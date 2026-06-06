'use client';

import { useState } from 'react';

import type { MatchDetail } from '@/db/queries';
import { useDictionary } from '@/lib/i18n/context';

import { BracketLayout } from './BracketLayout';
import { TournamentBracket } from './TournamentBracket';

type ViewMode = 'bracket' | 'cards';

type TournamentViewToggleProps = {
  matches: MatchDetail[];
};

export function TournamentViewToggle({ matches }: TournamentViewToggleProps) {
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
