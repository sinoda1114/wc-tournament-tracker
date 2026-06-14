import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Anchor, Container, Stack, Text, Title } from '@mantine/core';

import { AdminDataHealth } from '@/components/AdminDataHealth';
import { isAdmin } from '@/lib/auth';
import { runDataAudit } from '@/lib/ingest/run-audit';

export const dynamic = 'force-dynamic';

/**
 * /admin/health — 取込データの自動監査結果（T-82）。
 * 所有者（ADMIN_EMAILS 一致）以外には存在を隠す（404）。
 */
export default async function AdminHealthPage() {
  if (!(await isAdmin())) {
    notFound();
  }

  const report = await runDataAudit();

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Anchor component={Link} href="/admin" size="sm">
            ← 試合結果更新（管理トップ）へ戻る
          </Anchor>
          <Title order={1}>データヘルス</Title>
          <Text c="dimmed">
            取込データの自動監査。鮮度（KO後も未終了＝未取込疑い）と整合（得点者とスコアの過不足）を検知します。
          </Text>
        </Stack>

        <AdminDataHealth report={report} />
      </Stack>
    </Container>
  );
}
