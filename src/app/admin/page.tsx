import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Anchor, Container, Divider, Stack, Text, Title } from '@mantine/core';

import { AdminMatchTable } from '@/components/AdminMatchTable';
import { AdminVoteReset } from '@/components/AdminVoteReset';
import { listTournamentMatches } from '@/db/queries';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // 所有者（ADMIN_EMAILS 一致）以外には存在を隠す（404）。
  if (!(await isAdmin())) {
    notFound();
  }

  const matches = await listTournamentMatches();

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>試合結果更新</Title>
          <Text c="dimmed">スコアと勝者を保存すると、次の試合へ自動反映されます。</Text>
          <Anchor component={Link} href="/admin/health" size="sm">
            → データヘルス（取込の自動監査）
          </Anchor>
        </Stack>

        <AdminMatchTable matches={matches} />

        <Divider my="sm" />

        <Stack gap={4}>
          <Title order={2} size="h3">
            みんなの予想
          </Title>
          <Text c="dimmed">
            動作確認用に投票をリセットします（破壊操作・確認あり）。
          </Text>
        </Stack>

        <AdminVoteReset />
      </Stack>
    </Container>
  );
}
