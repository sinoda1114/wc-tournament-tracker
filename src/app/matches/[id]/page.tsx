import { Suspense } from 'react';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge, Container, Group, Stack, Text, Title } from '@mantine/core';

import { JsonLd } from '@/components/JsonLd';
import { MatchEvents } from '@/components/MatchEvents';
import { MatchVersus } from '@/components/MatchVersus';
import { VenueInfoCard } from '@/components/VenueInfoCard';
import { VenueWeather } from '@/components/VenueWeather';
import { getMatchEvents } from '@/db/match-events';
import { getMatchDetail, getVenueMatchSummary } from '@/db/queries';
import {
  formatKickoff,
  formatMatchDateZoned,
  formatSlotLabel,
  type MatchStage,
} from '@/lib/bracket';
import { getSiteUrl } from '@/lib/env';
import { ogLocale } from '@/lib/i18n/alternates';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale, resolveTimeZone } from '@/lib/i18n/server';
import { localizedTeamName } from '@/lib/i18n/team-name';
import { buildBreadcrumbList, buildSportsEvent } from '@/lib/structured-data';
import { tzOffset } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

type MatchDetailPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 対戦カード・ステージを反映した動的メタデータ。
 * 確定前カードはスロット名（「勝者 #51」等）で説明し、未確定でも妥当なタイトルにする。
 * T-19: 表示言語に応じたチーム名・スロット名・ステージ名・テンプレを使う。
 * canonical は単一URL（/matches/<id>）固定で hreflang は付けない。
 */
export async function generateMetadata({
  params,
}: MatchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await resolveLocale();
  const dict = getDictionary(locale);
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) {
    return { title: dict.meta.matchDetail.fallback };
  }

  const match = await getMatchDetail(matchId);
  if (!match) {
    return { title: dict.meta.matchDetail.fallback };
  }

  // チームが確定していればロケール化名、未確定ならスロット名（言語対応）。
  const homeLabel =
    localizedTeamName(match.homeTeam, locale) ||
    formatSlotLabel(match.homeSlot, dict.match.slot);
  const awayLabel =
    localizedTeamName(match.awayTeam, locale) ||
    formatSlotLabel(match.awaySlot, dict.match.slot);
  const stageLabel = dict.match.stage[match.stage as MatchStage] ?? match.stage;
  const tmpl = dict.meta.matchDetail;
  const title = tmpl.title
    .replace('{home}', homeLabel)
    .replace('{away}', awayLabel)
    .replace('{stage}', stageLabel);
  const description = tmpl.description
    .replace('{home}', homeLabel)
    .replace('{away}', awayLabel)
    .replace('{stage}', stageLabel)
    .replace('{stadium}', match.venue.stadiumName)
    .replace('{city}', match.venue.city);
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
      locale: ogLocale(locale),
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
  // グループリーグの試合は「どのグループか（グループA 等）」を併記する。
  const groupLabel =
    match.stage === 'group_stage' && match.groupLetter
      ? dict.groups.groupHeading.replace('{letter}', match.groupLetter)
      : null;
  const kickoff = formatKickoff(match.kickoffAt, timeZone);
  const kickoffAbbrev = match.kickoffAt ? tzOffset(timeZone, new Date(match.kickoffAt)) : '';
  const venueSummary = await getVenueMatchSummary(match.venueId);
  const events = await getMatchEvents(match.id);

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
          <Title order={1}>{groupLabel ? `${stageLabel} · ${groupLabel}` : stageLabel}</Title>
          <Group gap="sm">
            <Badge variant="light">{formatMatchDateZoned(match, timeZone, dict.match.weekdays)}</Badge>
            {kickoff ? (
              <Badge variant="light" color="blue" title={timeZone}>
                {kickoff} {kickoffAbbrev}
              </Badge>
            ) : null}
            {match.status !== 'scheduled' ? (
              <Badge color={match.status === 'finished' ? 'green' : 'yellow'}>
                {dict.match.status[match.status]}
              </Badge>
            ) : null}
          </Group>
        </Stack>

        <Stack
          p="lg"
          style={{
            border: '1px solid var(--wc-border)',
            borderRadius: 16,
            background: 'var(--wc-surface)',
          }}
        >
          <MatchVersus match={match} nameMode="full" size="md" />
        </Stack>

        <MatchEvents events={events} match={match} dict={dict} locale={locale} />

        <VenueInfoCard venue={match.venue} summary={venueSummary} locale={locale} dict={dict} />

        <Suspense fallback={null}>
          <VenueWeather
            venueId={match.venueId}
            matchDate={match.matchDate}
            dateLabel={formatMatchDateZoned(match, timeZone, dict.match.weekdays)}
            locale={locale}
            dict={dict}
          />
        </Suspense>
      </Stack>
    </Container>
  );
}
