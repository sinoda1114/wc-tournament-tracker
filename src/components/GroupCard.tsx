'use client';

import Link from 'next/link';
import { Text } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { FilterableMatchList } from '@/components/FilterableMatchList';
import type { MatchDetail, Team } from '@/db/queries';
import type { Locale } from '@/lib/i18n/config';
import { useI18n } from '@/lib/i18n/context';
import { localizedTeamName } from '@/lib/i18n/team-name';
import { calculateGroupStandings, type GroupStanding } from '@/lib/standings';

type GroupCardProps = {
  letter: string;
  teams: Team[];
  /** カード下部に並ぶ試合カード。日付フィルター適用後の配列が入る想定。 */
  matches: MatchDetail[];
  /**
   * 順位表計算に使う試合。省略時は `matches` を使う。
   * 日付フィルターを掛けても順位表は「グループ全体の最新順位」を見せたいので、
   * 呼び出し側で全試合配列を渡せるようにしている。
   */
  standingsMatches?: MatchDetail[];
};

function teamLookup(teams: Team[]): Map<string, Team> {
  return new Map(teams.map((t) => [t.id, t]));
}

export function GroupCard({
  letter,
  teams,
  matches,
  standingsMatches,
}: GroupCardProps) {
  const { locale, dict } = useI18n();
  const t = dict.standings;
  const heading = dict.groups.groupHeading.replace('{letter}', letter);
  const standings = calculateGroupStandings(teams, standingsMatches ?? matches);
  const lookup = teamLookup(teams);

  return (
    <section className="wc-group-card" aria-label={t.groupAria.replace('{letter}', letter)}>
      <header className="wc-group-card-header">
        <Link
          href={`/groups/${letter.toLowerCase()}`}
          className="wc-group-title"
          aria-label={t.detailAria.replace('{letter}', letter)}
        >
          {heading}
        </Link>
      </header>

      <table className="wc-standings-table" aria-label={t.tableAria.replace('{letter}', letter)}>
        <thead>
          <tr>
            <th aria-label={t.posAria}>#</th>
            <th>{t.country}</th>
            <th>{t.team}</th>
            <th title={t.playedAria} aria-label={t.playedAria}>{t.played}</th>
            <th title={t.winAria} aria-label={t.winAria}>{t.win}</th>
            <th title={t.drawAria} aria-label={t.drawAria}>{t.draw}</th>
            <th title={t.lossAria} aria-label={t.lossAria}>{t.loss}</th>
            <th title={t.goalsForAria} aria-label={t.goalsForAria}>{t.goalsFor}</th>
            <th title={t.goalsAgainstAria} aria-label={t.goalsAgainstAria}>{t.goalsAgainst}</th>
            <th title={t.goalDiffAria} aria-label={t.goalDiffAria}>{t.goalDiff}</th>
            <th title={t.pointsAria} aria-label={t.pointsAria}>{t.points}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <StandingRow key={row.teamId} row={row} team={lookup.get(row.teamId)} locale={locale} />
          ))}
        </tbody>
      </table>

      <p className="wc-standings-legend">
        <span className="wc-legend-mark is-advancing" aria-hidden />
        {t.legendAdvancing}
        <span className="wc-legend-mark is-playoff" aria-hidden />
        {t.legendPlayoff}
      </p>

      <div className="wc-group-matches" aria-label={t.matchesAria.replace('{letter}', letter)}>
        {matches.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t.noMatches}
          </Text>
        ) : (
          <FilterableMatchList matches={matches} emptyText={t.favoriteNoMatches} />
        )}
      </div>
    </section>
  );
}

function StandingRow({
  row,
  team,
  locale,
}: {
  row: GroupStanding;
  team: Team | undefined;
  locale: Locale;
}) {
  // 1-2 位＝グループ突破、3 位＝ベスト3位通過の枠（上位8グループのみ R32 進出）、4 位＝敗退。
  const qualification =
    row.position <= 2 ? 'advancing' : row.position === 3 ? 'playoff' : 'out';
  return (
    <tr
      className={`wc-standings-row is-${qualification}${row.position === 2 ? ' is-cutoff' : ''}`}
    >
      <td>
        <span className="wc-standings-pos">{row.position}</span>
      </td>
      <td>
        {team ? (
          <CountryFlag fifaCode={team.fifaCode} size="sm" ariaLabel={team.nameJa} />
        ) : null}
      </td>
      <td>
        <span className="wc-standings-team-cell">
          <span style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
            {team?.fifaCode ?? row.teamId.toUpperCase()}
          </span>
          <Text component="span" size="xs" c="dimmed">
            {localizedTeamName(team, locale)}
          </Text>
        </span>
      </td>
      <td>{row.played}</td>
      <td>{row.wins}</td>
      <td>{row.draws}</td>
      <td>{row.losses}</td>
      <td>{row.goalsFor}</td>
      <td>{row.goalsAgainst}</td>
      <td>{formatGoalDifference(row.goalDifference)}</td>
      <td>{row.points}</td>
    </tr>
  );
}

function formatGoalDifference(gd: number): string {
  if (gd > 0) return `+${gd}`;
  return `${gd}`;
}
