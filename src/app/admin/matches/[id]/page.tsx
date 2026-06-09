import { TextLink } from '@/components/RouterLink';
import { notFound } from 'next/navigation';
import { Container, Group, Stack, Text, Title } from '@mantine/core';

import { AdminMatchForm } from '@/components/AdminMatchForm';
import { VenueBadge } from '@/components/VenueBadge';
import { getMatchDetail } from '@/db/queries';
import {
  STAGE_LABELS,
  formatMatchDateJst,
  getParticipantLabel,
  type MatchStage,
} from '@/lib/bracket';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type AdminMatchPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminMatchPage({ params }: AdminMatchPageProps) {
  // 所有者（ADMIN_EMAILS 一致）以外には存在を隠す（404）。
  if (!(await isAdmin())) {
    notFound();
  }

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

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Stack gap={4}>
            <TextLink href="/admin" c="dimmed" size="sm">
              ← 管理一覧へ
            </TextLink>
            <Title order={1}>
              第{match.id}試合 · {stageLabel}
            </Title>
            <Text c="dimmed">{formatMatchDateJst(match)}</Text>
          </Stack>
        </Group>

        <Stack gap={4}>
          <Text>{getParticipantLabel(match.homeTeam, match.homeSlot)}</Text>
          <Text>vs</Text>
          <Text>{getParticipantLabel(match.awayTeam, match.awaySlot)}</Text>
        </Stack>

        <VenueBadge venue={match.venue} />
        <AdminMatchForm match={match} />
      </Stack>
    </Container>
  );
}
