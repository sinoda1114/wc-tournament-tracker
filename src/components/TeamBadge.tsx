import type { Team } from '@/db/queries';
import { formatSlotLabel, isWinner } from '@/lib/bracket';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { localizedTeamName } from '@/lib/i18n/team-name';

import { CountryFlag } from './CountryFlag';

type TeamBadgeProps = {
  team: Team | null;
  slot: string;
  score: number | null;
  winnerTeamId: string | null;
  locale: Locale;
  dict: Dictionary;
};

export function TeamBadge({
  team,
  slot,
  score,
  winnerTeamId,
  locale,
  dict,
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
              {localizedTeamName(team, locale)}
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--wc-muted)' }}>
            {formatSlotLabel(slot, dict.match.slot)}
          </span>
        )}
      </span>
      {score !== null ? <strong>{score}</strong> : null}
    </div>
  );
}
