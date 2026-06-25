import { notFound } from 'next/navigation';
import { Container, Divider, Group, Stack, Text, Title } from '@mantine/core';

import { AdminMatchTable } from '@/components/AdminMatchTable';
import { AdminR32Resolve } from '@/components/AdminR32Resolve';
import { ButtonLink } from '@/components/RouterLink';
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
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Stack gap={4}>
            <Title order={1}>試合結果更新</Title>
            <Text c="dimmed">スコアと勝者を保存すると、次の試合へ自動反映されます。</Text>
          </Stack>
          {/* データヘルス（T-82・取込の自動監査）への導線を上部に目立つボタンで配置。
              Server Component から Mantine へ component={Link}（関数）を直接渡すと RSC で throw するため、
              関数渡しを client 境界に隠蔽した ButtonLink を使う。 */}
          <ButtonLink href="/admin/health" variant="light" leftSection="📊">
            データヘルス（取込の自動監査）
          </ButtonLink>
        </Group>

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

        <Divider my="sm" />

        <Stack gap={4}>
          <Title order={2} size="h3">
            決勝Tスロット解決
          </Title>
          <Text c="dimmed">
            グループが確定したのにブラケットに反映されていない場合に手動で実行します。
          </Text>
        </Stack>

        <AdminR32Resolve />
      </Stack>
    </Container>
  );
}
