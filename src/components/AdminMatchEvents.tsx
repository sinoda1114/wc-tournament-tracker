'use client';

import { useState, useTransition } from 'react';
import {
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';

import { createMatchEventAction, deleteMatchEventAction } from '@/app/admin/actions';
import type { MatchEvent, MatchEventType } from '@/db/match-events';
import type { MatchDetail } from '@/db/queries';

const TYPE_OPTIONS: { value: MatchEventType; label: string }[] = [
  { value: 'goal', label: '得点' },
  { value: 'own_goal', label: 'オウンゴール' },
  { value: 'penalty_goal', label: 'PK' },
  { value: 'yellow_card', label: 'イエロー' },
  { value: 'red_card', label: 'レッド' },
  { value: 'substitution', label: '交代' },
];

const TYPE_LABEL: Record<MatchEventType, string> = {
  goal: '得点',
  own_goal: 'OG',
  penalty_goal: 'PK',
  yellow_card: 'イエロー',
  red_card: 'レッド',
  substitution: '交代',
};

type AdminMatchEventsProps = {
  match: MatchDetail;
  events: MatchEvent[];
};

export function AdminMatchEvents({ match, events }: AdminMatchEventsProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const teamOptions = [
    match.homeTeam ? { value: match.homeTeam.id, label: `${match.homeTeam.fifaCode}（home）` } : null,
    match.awayTeam ? { value: match.awayTeam.id, label: `${match.awayTeam.fifaCode}（away）` } : null,
  ].filter((option): option is { value: string; label: string } => option !== null);

  const [type, setType] = useState<MatchEventType>('goal');
  const [minute, setMinute] = useState<number | string>('');
  const [teamId, setTeamId] = useState<string | null>(teamOptions[0]?.value ?? null);
  const [playerName, setPlayerName] = useState('');
  const [playerOut, setPlayerOut] = useState('');

  const teamCode = (id: string | null): string => {
    if (!id) return '';
    if (match.homeTeam && id === match.homeTeam.id) return match.homeTeam.fifaCode;
    if (match.awayTeam && id === match.awayTeam.id) return match.awayTeam.fifaCode;
    return '';
  };

  const onAdd = () => {
    setError(null);
    if (!playerName.trim()) {
      setError('選手名を入力してください');
      return;
    }
    startTransition(async () => {
      const result = await createMatchEventAction({
        matchId: match.id,
        type,
        minute: minute === '' ? null : Number(minute),
        teamId,
        playerName: playerName.trim(),
        playerOut: playerOut.trim() ? playerOut.trim() : null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPlayerName('');
      setPlayerOut('');
      setMinute('');
    });
  };

  const onDelete = (id: number) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteMatchEventAction(match.id, id);
      if (!result.ok) {
        setError(result.message);
      }
    });
  };

  return (
    <Stack gap="sm">
      <Title order={2} size="h4">
        試合イベント（手動）
      </Title>

      {events.length > 0 ? (
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>分</Table.Th>
              <Table.Th>種別</Table.Th>
              <Table.Th>選手</Table.Th>
              <Table.Th>チーム</Table.Th>
              <Table.Th>源</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.map((event) => (
              <Table.Tr key={event.id}>
                <Table.Td>{event.minute ?? '-'}</Table.Td>
                <Table.Td>{TYPE_LABEL[event.type]}</Table.Td>
                <Table.Td>
                  {event.playerName}
                  {event.playerOut
                    ? `（${event.type === 'substitution' ? '↓' : 'A'} ${event.playerOut}）`
                    : ''}
                </Table.Td>
                <Table.Td>{teamCode(event.teamId)}</Table.Td>
                <Table.Td>{event.source}</Table.Td>
                <Table.Td>
                  {event.source === 'manual' ? (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => onDelete(event.id)}
                      disabled={pending}
                    >
                      削除
                    </Button>
                  ) : null}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Text c="dimmed" size="sm">
          まだイベントはありません。
        </Text>
      )}

      <Group align="flex-end" gap="xs" wrap="wrap">
        <Select
          label="種別"
          data={TYPE_OPTIONS}
          value={type}
          onChange={(value) => setType((value as MatchEventType | null) ?? 'goal')}
          w={120}
          allowDeselect={false}
        />
        <NumberInput
          label="分"
          value={minute}
          onChange={setMinute}
          min={0}
          max={130}
          w={80}
        />
        <Select
          label="チーム"
          data={teamOptions}
          value={teamId}
          onChange={setTeamId}
          w={150}
          clearable
        />
        <TextInput
          label="選手（交代は入る選手 IN）"
          value={playerName}
          onChange={(event) => setPlayerName(event.currentTarget.value)}
          w={160}
        />
        <TextInput
          label="アシスト / 交代は退く選手 OUT"
          value={playerOut}
          onChange={(event) => setPlayerOut(event.currentTarget.value)}
          w={170}
        />
        <Button onClick={onAdd} loading={pending}>
          追加
        </Button>
      </Group>

      {error ? (
        <Text c="red" size="sm">
          {error}
        </Text>
      ) : null}
    </Stack>
  );
}
