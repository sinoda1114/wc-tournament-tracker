import { notFound } from 'next/navigation';
import { Badge, Container, Group, Stack, Text, Title } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { TeamBadge } from '@/components/TeamBadge';
import { VenueInfoCard } from '@/components/VenueInfoCard';
import { getMatchDetail, getVenueMatchSummary } from '@/db/queries';
import {
  STAGE_LABELS,
  STATUS_LABELS,
  formatKickoffJst,
  formatMatchDateJst,
  type MatchStage,
} from '@/lib/bracket';

export const dynamic = 'force-dynamic';

type MatchDetailPageProps = {
  params: Promise<{ id: string }>;
};

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

  const stageLabel = STAGE_LABELS[match.stage as MatchStage] ?? match.stage;
  const kickoffJst = formatKickoffJst(match.kickoffAt);
  const venueSummary = await getVenueMatchSummary(match.venueId);

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Stack gap={6}>
          <Text c="dimmed">第{match.id}試合</Text>
          <Title order={1}>{stageLabel}</Title>
          <Group gap="sm">
            <Badge
              variant="light"
              leftSection={
                <CountryFlag
                  fifaCode={match.venue.countryCode}
                  size="sm"
                  ariaLabel={`${match.venue.country} 開催`}
                />
              }
            >
              {formatMatchDateJst(match)}
            </Badge>
            {kickoffJst ? (
              <Badge variant="light" color="blue" title="日本時間（JST）">
                {kickoffJst} JST
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
              {STATUS_LABELS[match.status]}
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
          />
          <TeamBadge
            team={match.awayTeam}
            slot={match.awaySlot}
            score={match.awayScore}
            winnerTeamId={match.winnerTeamId}
          />
        </Stack>

        <VenueInfoCard venue={match.venue} summary={venueSummary} />
      </Stack>
    </Container>
  );
}
