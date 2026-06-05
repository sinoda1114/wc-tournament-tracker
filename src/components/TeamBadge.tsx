import type { Team } from '@/db/queries';
import { formatSlotLabel, isWinner } from '@/lib/bracket';

import { CountryFlag } from './CountryFlag';

type TeamBadgeProps = {
  team: Team | null;
  slot: string;
  score: number | null;
  winnerTeamId: string | null;
};

export function TeamBadge({
  team,
  slot,
  score,
  winnerTeamId,
}: TeamBadgeProps) {
  const winner = isWinner(team?.id ?? null, winnerTeamId);

  return (
    <div className={`wc-team-row${winner ? ' is-winner' : ''}`}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          flex: 1,
          minWidth: 0,
        }}
      >
        {team ? (
          <>
            <CountryFlag fifaCode={team.fifaCode} size="md" />
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {team.nameJa}
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--wc-muted)' }}>{formatSlotLabel(slot)}</span>
        )}
      </span>
      {score !== null ? <strong>{score}</strong> : null}
    </div>
  );
}
