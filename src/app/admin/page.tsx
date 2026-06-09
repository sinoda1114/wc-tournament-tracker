import { notFound } from 'next/navigation';
import { Container, Stack, Text, Title } from '@mantine/core';

import { AdminMatchTable } from '@/components/AdminMatchTable';
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
        </Stack>

        <AdminMatchTable matches={matches} />
      </Stack>
    </Container>
  );
}
