'use client';

import { useState, useTransition } from 'react';
import { Button, NumberInput, Select, Stack, Text } from '@mantine/core';

import type { MatchDetail, MatchStatus } from '@/db/queries';
import { STATUS_LABELS } from '@/lib/bracket';

import { updateAdminMatchAction } from '@/app/admin/actions';

type AdminMatchFormProps = {
  match: MatchDetail;
};

export function AdminMatchForm({ match }: AdminMatchFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState<number | string>(
    match.homeScore ?? '',
  );
  const [awayScore, setAwayScore] = useState<number | string>(
    match.awayScore ?? '',
  );
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(
    match.winnerTeamId,
  );

  const participantOptions = [
    ...(match.homeTeam
      ? [{ value: match.homeTeam.id, label: `${match.homeTeam.nameJa}（${match.homeTeam.fifaCode}）` }]
      : []),
    ...(match.awayTeam
      ? [{ value: match.awayTeam.id, label: `${match.awayTeam.nameJa}（${match.awayTeam.fifaCode}）` }]
      : []),
  ];

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      const result = await updateAdminMatchAction({
        matchId: match.id,
        homeScore: homeScore === '' ? null : Number(homeScore),
        awayScore: awayScore === '' ? null : Number(awayScore),
        winnerTeamId,
        status,
      });

      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <Stack gap="md">
      <NumberInput
        label={`${match.homeTeam ? match.homeTeam.nameJa : '左'}の得点`}
        value={homeScore}
        min={0}
        onChange={setHomeScore}
      />
      <NumberInput
        label={`${match.awayTeam ? match.awayTeam.nameJa : '右'}の得点`}
        value={awayScore}
        min={0}
        onChange={setAwayScore}
      />
      <Select
        label="ステータス"
        value={status}
        data={Object.entries(STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        onChange={(value) => setStatus((value as MatchStatus) ?? 'scheduled')}
      />
      {participantOptions.length > 0 ? (
        <Select
          label="勝者（同点・PK時は明示選択）"
          value={winnerTeamId}
          data={participantOptions}
          clearable
          onChange={setWinnerTeamId}
        />
      ) : (
        <Text size="sm" c="dimmed">
          チーム未確定のため、勝者はスコア確定後に選択できます。
        </Text>
      )}
      {error ? (
        <Text size="sm" c="red">
          {error}
        </Text>
      ) : null}
      <Button loading={pending} onClick={handleSubmit}>
        保存して次の試合へ反映
      </Button>
    </Stack>
  );
}
