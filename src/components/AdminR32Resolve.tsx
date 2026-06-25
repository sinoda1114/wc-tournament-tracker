'use client';

import { useState, useTransition } from 'react';
import { Alert, Button, Group, Paper, Stack, Text } from '@mantine/core';

import { resolveRoundOf32Action } from '@/app/admin/actions';

type ResolveResult = { ok: boolean; updated?: number; message?: string };

/** /admin の「決勝Tスロット解決」セクション。確定グループの R32 入口を即反映する。 */
export function AdminR32Resolve() {
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    setResult(null);
    startTransition(async () => {
      const res = await resolveRoundOf32Action();
      setResult(res);
    });
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <Stack gap={4}>
          <Text fw={600}>決勝Tスロット解決（R32 入口）</Text>
          <Text size="sm" c="dimmed">
            確定済みグループの1位・2位を R32 の各スロットへ即時反映します。通常は ingest 経由で自動反映されますが、手動で強制実行できます。
          </Text>
        </Stack>
        <Group gap="sm" wrap="wrap">
          <Button variant="light" color="blue" onClick={run} loading={isPending}>
            今すぐ R32 スロットを解決
          </Button>
        </Group>
        {result ? (
          <Alert
            color={result.ok ? 'teal' : 'red'}
            variant="light"
            title={result.ok ? '完了' : 'エラー'}
          >
            {result.ok
              ? `更新スロット数: ${result.updated ?? 0}`
              : (result.message ?? '失敗しました')}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
}
