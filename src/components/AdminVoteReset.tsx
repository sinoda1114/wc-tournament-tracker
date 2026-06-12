'use client';

import { useState, useTransition } from 'react';
import { Alert, Button, Group, Paper, Select, Stack, Text } from '@mantine/core';

import {
  resetMyCrowdVoteByStageAction,
  resetMyCrowdVotesAction,
} from '@/app/admin/actions';
import { STAGE_LABELS, VOTING_STAGES } from '@/lib/crowd';

type ResetResult = { ok: boolean; message?: string };

const STAGE_OPTIONS = VOTING_STAGES.map((stage) => ({
  value: stage,
  label: STAGE_LABELS[stage],
}));

/**
 * /admin の「みんなの予想 投票リセット（自分の票のみ）」セクション（T-48）。
 *
 * 安全設計（重要）: リセットは **ログイン中の管理者自身の票だけ** を対象にする
 * （サーバー側で `voter_id = requireVoterId()` に限定）。**他ユーザーの票を消す機能は持たない**
 * ＝誤操作で本番の全投票が飛ぶ事故を構造的に防ぐ。あくまで管理者1アカウントの投票テスト用。
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
        `自分の「${label}」の投票を削除します。よろしいですか？（自分の票のみ・取り消せません）`,
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const res = await resetMyCrowdVoteByStageAction(stage);
      setResult(res);
    });
  };

  const runAllMineReset = () => {
    if (
      !window.confirm(
        '自分の投票を全ステージ分まとめて削除します。よろしいですか？（自分の票のみ・他ユーザーには影響しません）',
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const res = await resetMyCrowdVotesAction();
      setResult(res);
    });
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <Stack gap={4}>
          <Text fw={600}>みんなの予想 投票リセット（自分の票のみ）</Text>
          <Text size="sm" c="dimmed">
            運用テスト用。自分（ログイン中の管理者）の投票だけを削除します。他ユーザーの票には一切触れません。削除後は優勝予想ページの集計に反映されます。
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
            自分のこのステージをリセット
          </Button>
        </Group>

        <Group gap="sm" wrap="wrap">
          <Button
            variant="outline"
            color="orange"
            onClick={runAllMineReset}
            loading={isPending}
          >
            自分の投票を全ステージ分リセット
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
