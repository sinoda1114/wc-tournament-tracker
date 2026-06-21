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
  /**
   * グループステージが結果として確定したか（#33）。false の間は完全フラット（色なし）。
   * 確定後にだけ進出チームを着色する（「未確定なのに色が付くのは不自然」という方針）。
   */
  confirmed?: boolean;
  /**
   * 確定後、このグループの3位が「ベスト3位上位8」で決勝T進出したか（#33）。
   * 他グループとの比較が必要なため、全12組を持つ親（GroupsFilterableGrid）が算出して渡す。
   * confirmed が false の間は参照されない。
   */
  thirdPlaceQualified?: boolean;
  /**
   * 決勝T進出が「数学的に確定（クリンチ）」したチームの id 集合（T-105）。
   * 1-2位の突破はグループ完了を待たず、確定した瞬間にこの集合へ入り緑になる。
   * 3位通過枠は他組比較が要るので従来どおり confirmed（全組消化後）でのみ着色する。
   */
  clinchedTeamIds?: ReadonlySet<string>;
};

function teamLookup(teams: Team[]): Map<string, Team> {
  return new Map(teams.map((t) => [t.id, t]));
}

export function GroupCard({
  letter,
  teams,
  matches,
  standingsMatches,
  confirmed = false,
  thirdPlaceQualified = false,
  clinchedTeamIds,
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
            <StandingRow
              key={row.teamId}
              row={row}
              team={lookup.get(row.teamId)}
              locale={locale}
              confirmed={confirmed}
              thirdPlaceQualified={thirdPlaceQualified}
              clinched={clinchedTeamIds?.has(row.teamId) ?? false}
            />
          ))}
        </tbody>
      </table>

      {/* 凡例（コンパクト）。緑＝決勝トーナメント進出。確定後に進出チームの行が緑になる（#33）。 */}
      <p className="wc-standings-legend">
        <span className="wc-legend-mark is-advancing" aria-hidden />
        {t.legendAdvancing}
      </p>

      <div className="wc-group-matches" aria-label={t.matchesAria.replace('{letter}', letter)}>
        {matches.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t.noMatches}
          </Text>
        ) : (
          <FilterableMatchList
            matches={matches}
            emptyText={t.favoriteNoMatches}
            showContextLabel={false}
            teamNameMode="code"
          />
        )}
      </div>
    </section>
  );
}

/**
 * 行に付ける進出カラーのクラス（#33 / T-105）。
 * - 1-2位の突破は「数学的確定（クリンチ）」で着色＝グループ完了を待たない（clinched=true で緑）。
 * - 3位はベスト3位上位8の判定が他組比較を要するため、従来どおり confirmed（全12組消化後）かつ
 *   thirdPlaceQualified のときだけ緑。
 * - それ以外はフラット（色なし）。
 */
function advancingRowClass(
  position: number,
  clinched: boolean,
  confirmed: boolean,
  thirdPlaceQualified: boolean,
): string {
  if (clinched) return 'is-advancing';
  if (confirmed && position === 3 && thirdPlaceQualified) return 'is-advancing';
  return '';
}

function StandingRow({
  row,
  team,
  locale,
  confirmed,
  thirdPlaceQualified,
  clinched,
}: {
  row: GroupStanding;
  team: Team | undefined;
  locale: Locale;
  confirmed: boolean;
  thirdPlaceQualified: boolean;
  clinched: boolean;
}) {
  const rowClass = advancingRowClass(row.position, clinched, confirmed, thirdPlaceQualified);
  return (
    <tr className={`wc-standings-row ${rowClass}`.trim()}>
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
