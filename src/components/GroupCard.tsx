import Link from 'next/link';
import { Text } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { FilterableMatchList } from '@/components/FilterableMatchList';
import type { MatchDetail, Team } from '@/db/queries';
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
  const standings = calculateGroupStandings(teams, standingsMatches ?? matches);
  const lookup = teamLookup(teams);

  return (
    <section className="wc-group-card" aria-label={`グループ${letter}`}>
      <header className="wc-group-card-header">
        <Link
          href={`/groups/${letter.toLowerCase()}`}
          className="wc-group-title"
          aria-label={`グループ${letter} の詳細`}
        >
          グループ{letter}
        </Link>
      </header>

      <table className="wc-standings-table" aria-label={`グループ${letter} 順位表`}>
        <thead>
          <tr>
            <th aria-label="順位">#</th>
            <th>国</th>
            <th>チーム</th>
            <th title="試合数" aria-label="試合数">試</th>
            <th title="勝" aria-label="勝">勝</th>
            <th title="分" aria-label="分">分</th>
            <th title="負" aria-label="負">負</th>
            <th title="得点" aria-label="得点">得</th>
            <th title="失点" aria-label="失点">失</th>
            <th title="得失点差" aria-label="得失点差">差</th>
            <th title="勝点" aria-label="勝点">勝点</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <StandingRow key={row.teamId} row={row} team={lookup.get(row.teamId)} />
          ))}
        </tbody>
      </table>

      <p className="wc-standings-legend">
        <span className="wc-legend-mark is-advancing" aria-hidden />
        突破（上位2）
        <span className="wc-legend-mark is-playoff" aria-hidden />
        3位通過枠
      </p>

      <div className="wc-group-matches" aria-label={`グループ${letter} 試合一覧`}>
        {matches.length === 0 ? (
          <Text c="dimmed" size="sm">
            このグループの試合データはまだありません。
          </Text>
        ) : (
          <FilterableMatchList
            matches={matches}
            emptyText="お気に入りチームの試合はこのグループにはありません。"
          />
        )}
      </div>
    </section>
  );
}

function StandingRow({
  row,
  team,
}: {
  row: GroupStanding;
  team: Team | undefined;
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
            {team?.nameJa ?? ''}
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
