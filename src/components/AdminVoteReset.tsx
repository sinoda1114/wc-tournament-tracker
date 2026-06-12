'use client';

import { useState, useTransition } from 'react';
import { Alert, Button, Group, Paper, Select, Stack, Text } from '@mantine/core';

import {
  resetAllCrowdVotesAction,
  resetCrowdVotesByStageAction,
} from '@/app/admin/actions';
import { STAGE_LABELS, VOTING_STAGES } from '@/lib/crowd';

type ResetResult = { ok: boolean; message?: string };

const STAGE_OPTIONS = VOTING_STAGES.map((stage) => ({
  value: stage,
  label: STAGE_LABELS[stage],
}));

/**
 * /admin の「みんなの予想 投票リセット」セクション（T-47）。
 *
 * ステージ別 / 全リセットの2系統。どちらも破壊操作なので実行前に
 * ネイティブ confirm を挟む（全リセットは特に明示的に）。サーバーアクション側で
 * isAdmin() ゲートが効くため、UI はあくまで運用者向けの入口。
 *
 * NOTE: Mantine の compound（Select 等）を含むため `'use client'` に隔離する。
 */
export function AdminVoteReset() {
  const [stage, setStage] = useState<string | null>(VOTING_STAGES[0]);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const runStageReset = () => {
    if (!stage) return;
    const label = STAGE_LABELS[stage as (typeof VOTING_STAGES)[number]] ?? stage;
    if (
      !window.confirm(
        `「${label}」の投票をすべて削除します。本当に削除しますか？（取り消せません）`,
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const res = await resetCrowdVotesByStageAction(stage);
      setResult(res);
    });
  };

  const runAllReset = () => {
    if (
      !window.confirm(
        '【全リセット】すべてのステージの投票を完全に削除します。まっさらになります。本当によろしいですか？（取り消せません）',
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const res = await resetAllCrowdVotesAction();
      setResult(res);
    });
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <Stack gap={4}>
          <Text fw={600}>みんなの予想 投票リセット</Text>
          <Text size="sm" c="dimmed">
            運用テスト用。指定ステージだけ、または全ての投票を削除します。削除後は優勝予想ページの集計に反映されます。
          </Text>
        </Stack>

        <Group align="end" gap="sm" wrap="wrap">
          <Select
            label="ステージ"
            data={STAGE_OPTIONS}
            value={stage}
            onChange={setStage}
            allowDeselect={false}
            w={200}
            disabled={isPending}
          />
          <Button
            variant="light"
            color="orange"
            onClick={runStageReset}
            loading={isPending}
            disabled={!stage}
          >
            このステージをリセット
          </Button>
        </Group>

        <Group gap="sm" wrap="wrap">
          <Button
            variant="outline"
            color="red"
            onClick={runAllReset}
            loading={isPending}
          >
            全ステージをリセット（まっさら）
          </Button>
        </Group>

        {result ? (
          <Alert
            color={result.ok ? 'teal' : 'red'}
            variant="light"
            title={result.ok ? '完了' : 'エラー'}
          >
            {result.message ?? (result.ok ? '削除しました' : '失敗しました')}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
}
