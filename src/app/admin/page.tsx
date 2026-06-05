import { redirect } from 'next/navigation';
import { Button, Container, Group, Stack, Text, Title } from '@mantine/core';

import { logoutAdminAction } from '@/app/admin/actions';
import { AdminMatchTable } from '@/components/AdminMatchTable';
import { listTournamentMatches } from '@/db/queries';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const matches = await listTournamentMatches();

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Stack gap={4}>
            <Title order={1}>試合結果更新</Title>
            <Text c="dimmed">
              スコアと勝者を保存すると、次の試合へ自動反映されます。
            </Text>
          </Stack>
          <form action={logoutAdminAction}>
            <Button type="submit" variant="default">
              ログアウト
            </Button>
          </form>
        </Group>

        <AdminMatchTable matches={matches} />
      </Stack>
    </Container>
  );
}
