'use client';

import { useMemo } from 'react';
import { Badge, Group, Stack, Text } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { FavoriteStar } from '@/components/FavoriteStar';
import type { SquadPlayer, TeamSquad } from '@/db/queries';
import { calcAge } from '@/lib/age';
import {
  classifyPosition,
  POSITION_GROUPS,
  type PositionGroup,
} from '@/lib/positions';

type SquadPanelProps = {
  squad: TeamSquad;
};

function ageLabel(dateBorn: string | null): string {
  const age = calcAge(dateBorn);
  return age === null ? '—' : `${age}歳`;
}

/**
 * 選手をポジショングループ（GK/DF/MF/FW/その他）ごとに束ねる。
 * 空のグループは表示しない。
 */
function groupPlayers(players: SquadPlayer[]) {
  const buckets = new Map<PositionGroup, SquadPlayer[]>();
  for (const p of players) {
    const g = classifyPosition(p.position);
    const bucket = buckets.get(g) ?? [];
    bucket.push(p);
    buckets.set(g, bucket);
  }
  return POSITION_GROUPS.map(({ group, label }) => ({
    group,
    label,
    players: buckets.get(group) ?? [],
  })).filter((g) => g.players.length > 0);
}

export function SquadPanel({ squad }: SquadPanelProps) {
  const { team, coach, players } = squad;
  const grouped = useMemo(() => groupPlayers(players), [players]);

  const isEmpty = !coach && players.length === 0;

  return (
    <div className="wc-squad">
      <Group gap="sm" align="center" wrap="nowrap" mb="xs">
        <CountryFlag fifaCode={team.fifaCode} size="lg" ariaLabel={team.nameJa} />
        <Text fw={700} size="lg">
          {team.nameJa}
        </Text>
        <Text size="sm" c="dimmed" ff="monospace" style={{ letterSpacing: '0.04em' }}>
          {team.fifaCode}
        </Text>
        <FavoriteStar fifaCode={team.fifaCode} teamName={team.nameJa} size="md" />
      </Group>

      {isEmpty ? (
        <Text c="dimmed" size="sm">
          この国のメンバー情報は準備中です。
        </Text>
      ) : (
        <Stack gap="md">
          {grouped.map(({ group, label, players: groupPlayersList }) => (
            <div key={group} className="wc-squad-group">
              <Text className="wc-squad-group-title" size="xs" c="dimmed" tt="uppercase">
                {label}（{groupPlayersList.length}）
              </Text>
              <ul className="wc-squad-list">
                {groupPlayersList.map((p) => (
                  <li key={p.id} className="wc-squad-player">
                    <span className="wc-squad-num">{p.number || '—'}</span>
                    <span className="wc-squad-name">{p.name}</span>
                    <span className="wc-squad-age">{ageLabel(p.dateBorn)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {coach ? (
            <Group gap="xs" align="center" wrap="wrap">
              <Badge color="yellow" variant="light" radius="sm">
                監督
              </Badge>
              {coach.nationalityIso ? (
                <CountryFlag
                  iso={coach.nationalityIso}
                  size="sm"
                  ariaLabel={coach.nationality ?? undefined}
                />
              ) : null}
              <Text fw={600}>{coach.name}</Text>
            </Group>
          ) : null}
        </Stack>
      )}
    </div>
  );
}
