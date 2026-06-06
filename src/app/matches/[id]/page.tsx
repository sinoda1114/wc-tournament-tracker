import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge, Container, Group, Stack, Text, Title } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { JsonLd } from '@/components/JsonLd';
import { TeamBadge } from '@/components/TeamBadge';
import { VenueInfoCard } from '@/components/VenueInfoCard';
import { getMatchDetail, getVenueMatchSummary } from '@/db/queries';
import {
  formatKickoff,
  formatMatchDateZoned,
  getParticipantLabel,
  STAGE_LABELS,
  type MatchStage,
} from '@/lib/bracket';
import { getSiteUrl } from '@/lib/env';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale, resolveTimeZone } from '@/lib/i18n/server';
import { buildBreadcrumbList, buildSportsEvent } from '@/lib/structured-data';
import { tzOffset } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

type MatchDetailPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 対戦カード・ステージを反映した動的メタデータ。
 * 確定前カードはスロット名（「勝者 #51」等）で説明し、未確定でも妥当なタイトルにする。
 */
export async function generateMetadata({
  params,
}: MatchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) {
    return { title: '試合詳細' };
  }

  const match = await getMatchDetail(matchId);
  if (!match) {
    return { title: '試合詳細' };
  }

  const stageLabel = STAGE_LABELS[match.stage as MatchStage] ?? match.stage;
  const homeLabel = getParticipantLabel(match.homeTeam, match.homeSlot);
  const awayLabel = getParticipantLabel(match.awayTeam, match.awaySlot);
  const title = `${homeLabel} vs ${awayLabel}（${stageLabel}）`;
  const description = `${stageLabel}「${homeLabel} 対 ${awayLabel}」の日程・会場・結果。${match.venue.stadiumName}（${match.venue.city}）で開催。`;
  const canonical = `/matches/${match.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = await params;
  const matchId = Number(id);

  if (!Number.isInteger(matchId)) {
    notFound();
  }

  const match = await getMatchDetail(matchId);

  if (!match) {
    notFound();
  }

  const locale = await resolveLocale();
  const dict = getDictionary(locale);
  const timeZone = await resolveTimeZone();
  const stageLabel = dict.match.stage[match.stage as MatchStage] ?? match.stage;
  const kickoff = formatKickoff(match.kickoffAt, timeZone);
  const kickoffAbbrev = match.kickoffAt ? tzOffset(timeZone, new Date(match.kickoffAt)) : '';
  const venueSummary = await getVenueMatchSummary(match.venueId);

  // 構造化データ: 試合 = SportsEvent、ナビ階層 = BreadcrumbList。
  const baseUrl = getSiteUrl();
  const jsonLd = [
    buildSportsEvent(baseUrl, match),
    buildBreadcrumbList(baseUrl, [
      { name: 'トップ', path: '/' },
      { name: stageLabel, path: `/matches/${match.id}` },
    ]),
  ];

  return (
    <Container size="md" py="xl">
      <JsonLd data={jsonLd} />
      <Stack gap="lg">
        <Stack gap={6}>
          <Text c="dimmed">{dict.matchDetail.number.replace('{n}', String(match.id))}</Text>
          <Title order={1}>{stageLabel}</Title>
          <Group gap="sm">
            <Badge
              variant="light"
              leftSection={
                <CountryFlag
                  fifaCode={match.venue.countryCode}
                  size="sm"
                  ariaLabel={dict.match.venueHostingAria.replace('{country}', match.venue.country)}
                />
              }
            >
              {formatMatchDateZoned(match, timeZone)}
            </Badge>
            {kickoff ? (
              <Badge variant="light" color="blue" title={timeZone}>
                {kickoff} {kickoffAbbrev}
              </Badge>
            ) : null}
            <Badge
              color={
                match.status === 'finished'
                  ? 'green'
                  : match.status === 'in_progress'
                    ? 'yellow'
                    : 'gray'
              }
            >
              {dict.match.status[match.status]}
            </Badge>
          </Group>
        </Stack>

        <Stack
          gap="md"
          p="lg"
          style={{
            border: '1px solid var(--wc-border)',
            borderRadius: 16,
            background: 'var(--wc-surface)',
          }}
        >
          <TeamBadge
            team={match.homeTeam}
            slot={match.homeSlot}
            score={match.homeScore}
            winnerTeamId={match.winnerTeamId}
            locale={locale}
            dict={dict}
          />
          <TeamBadge
            team={match.awayTeam}
            slot={match.awaySlot}
            score={match.awayScore}
            winnerTeamId={match.winnerTeamId}
            locale={locale}
            dict={dict}
          />
        </Stack>

        <VenueInfoCard venue={match.venue} summary={venueSummary} locale={locale} dict={dict} />
      </Stack>
    </Container>
  );
}
