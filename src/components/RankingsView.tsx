'use client';

import { Container, Stack, Table, Text, Title } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import type { Locale } from '@/lib/i18n/config';
import { useI18n } from '@/lib/i18n/context';
import type { Dictionary } from '@/lib/i18n/dictionary';
import {
  standardCompetitionRanks,
  type CardStat,
  type CardSuspension,
  type ScorerStat,
} from '@/lib/rankings';

type RankingsViewProps = {
  scorers: ScorerStat[];
  cards: CardStat[];
};

type TeamLike = { fifaCode: string | null; nameEn: string | null; nameJa: string | null };

function teamLabel(team: TeamLike, locale: Locale): string {
  if (locale === 'ja') return team.nameJa ?? team.nameEn ?? team.fifaCode ?? '';
  return team.nameEn ?? team.fifaCode ?? '';
}

/** 国旗＋国名のセル。チーム未確定（fifaCode 無し）は控えめなダッシュ。 */
function TeamCell({ team, locale }: { team: TeamLike; locale: Locale }) {
  if (!team.fifaCode) {
    return (
      <Text component="span" c="dimmed" size="sm">
        —
      </Text>
    );
  }
  return (
    <span className="wc-ranking-team">
      <CountryFlag fifaCode={team.fifaCode} size="sm" ariaLabel={teamLabel(team, locale)} />
      <Text component="span" size="sm">
        {teamLabel(team, locale)}
      </Text>
    </span>
  );
}

/** イエロー/レッドカードのアイコン（小さなカード型の矩形）。視認性のため列見出しに使う。 */
function CardGlyph({ color }: { color: 'yellow' | 'red' }) {
  const fill = color === 'yellow' ? '#eab308' : '#dc2626';
  return (
    <svg
      width={11}
      height={15}
      viewBox="0 0 11 15"
      aria-hidden
      focusable={false}
      style={{ verticalAlign: 'middle' }}
    >
      <rect x={0.5} y={0.5} width={10} height={14} rx={1.5} fill={fill} />
    </svg>
  );
}

/** YYYY-MM-DD... を M/D に整形（表示用）。 */
function formatMonthDay(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** 出場停止アイコン（🚫 no-entry）。次戦情報を aria-label/title に渡してA11yを担保（T-65）。 */
function SuspensionGlyph({ label }: { label: string }) {
  return (
    <span className="wc-ranking-susp-icon" role="img" aria-label={label} title={label}>
      🚫
    </span>
  );
}

/**
 * 出場停止セル。直感アイコン（🚫）＋次戦（M/D vs 対戦相手）を併記する（T-65）。
 * 無ければダッシュ。情報を失わないよう次戦テキストは残し、アイコンには次戦込みの
 * aria-label/title を付与して支援技術にテキスト相当を渡す。
 */
function SuspensionCell({
  suspension,
  locale,
  t,
}: {
  suspension: CardSuspension | null | undefined;
  locale: Locale;
  t: Dictionary['rankings'];
}) {
  if (!suspension) {
    return (
      <Text component="span" c="dimmed" size="sm">
        —
      </Text>
    );
  }
  const opponentLabel = suspension.opponent ? teamLabel(suspension.opponent, locale) : t.tbd;
  const nextMatch = `${formatMonthDay(suspension.matchDate)} vs ${opponentLabel}`;
  // 例: 「出場停止（6/18 vs 韓国）」をアイコンの代替テキストとして渡す。
  const ariaLabel = `${t.suspended}（${nextMatch}）`;
  return (
    <span className="wc-ranking-susp">
      <SuspensionGlyph label={ariaLabel} />
      <Text component="span" size="xs" c="dimmed">
        {nextMatch}
      </Text>
    </span>
  );
}

export function RankingsView({ scorers, cards }: RankingsViewProps) {
  const { locale, dict } = useI18n();
  const t = dict.rankings;

  const isEmpty = scorers.length === 0 && cards.length === 0;

  // 同点同順位（標準競争順位）を値ベースで算出（T-63）。並びは現状維持。
  const scorerRanks = standardCompetitionRanks(scorers, (s) => s.goals);
  // カードランキングはソート基準（赤→黄）に合わせ、合成キー値で同順位を判定。
  const cardRanks = standardCompetitionRanks(cards, (c) => c.red * 1000 + c.yellow);

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>{t.title}</Title>
          <Text c="dimmed">{t.description}</Text>
        </Stack>

        {isEmpty ? (
          <div className="wc-ranking-empty" role="status">
            <Text c="dimmed">{t.empty}</Text>
          </div>
        ) : (
          <Stack gap="xl">
            {/* 得点ランキング */}
            <section aria-labelledby="ranking-scorers">
              <Title id="ranking-scorers" order={2} size="h4" mb="xs">
                {t.scorersTitle}
              </Title>
              {scorers.length === 0 ? (
                <Text c="dimmed" size="sm">
                  {t.empty}
                </Text>
              ) : (
                <Table className="wc-ranking-table" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th aria-label={t.colRank}>{t.colRank}</Table.Th>
                      <Table.Th>{t.colPlayer}</Table.Th>
                      <Table.Th>{t.colTeam}</Table.Th>
                      <Table.Th ta="right">{t.colGoals}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {scorers.map((s, i) => (
                      <Table.Tr key={`${s.playerName}-${s.fifaCode ?? ''}`}>
                        <Table.Td>{scorerRanks[i]}</Table.Td>
                        <Table.Td>{s.playerName}</Table.Td>
                        <Table.Td>
                          <TeamCell team={s} locale={locale} />
                        </Table.Td>
                        <Table.Td ta="right" fw={700}>
                          {s.goals}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </section>

            {/* カード */}
            <section aria-labelledby="ranking-cards">
              <Title id="ranking-cards" order={2} size="h4" mb={4}>
                {t.cardsTitle}
              </Title>
              {/* カード規律（累積/リセット/退場）の注釈（WC2026 は警告リセットが2回）。 */}
              <Text c="dimmed" size="xs" mb="sm" className="wc-ranking-cards-note">
                {t.cardsNote}
              </Text>
              {cards.length === 0 ? (
                <Text c="dimmed" size="sm">
                  {t.empty}
                </Text>
              ) : (
                <Table className="wc-ranking-table" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th aria-label={t.colRank}>{t.colRank}</Table.Th>
                      <Table.Th>{t.colPlayer}</Table.Th>
                      <Table.Th>{t.colTeam}</Table.Th>
                      <Table.Th ta="right" title={t.colYellowAria} aria-label={t.colYellowAria}>
                        <CardGlyph color="yellow" />
                      </Table.Th>
                      <Table.Th ta="right" title={t.colRedAria} aria-label={t.colRedAria}>
                        <CardGlyph color="red" />
                      </Table.Th>
                      <Table.Th aria-label={t.colStatus} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {cards.map((c, i) => (
                      <Table.Tr key={`${c.playerName}-${c.fifaCode ?? ''}`}>
                        <Table.Td>{cardRanks[i]}</Table.Td>
                        <Table.Td>{c.playerName}</Table.Td>
                        <Table.Td>
                          <TeamCell team={c} locale={locale} />
                        </Table.Td>
                        <Table.Td ta="right">{c.yellow}</Table.Td>
                        <Table.Td ta="right" fw={c.red > 0 ? 700 : 400}>
                          {c.red}
                        </Table.Td>
                        <Table.Td>
                          <SuspensionCell suspension={c.suspension} locale={locale} t={t} />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </section>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
