'use client';

import { useMemo } from 'react';
import { Badge, Group, Stack, Text } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { FavoriteStar } from '@/components/FavoriteStar';
import type { SquadPlayer, TeamSquad } from '@/db/queries';
import { calcAge } from '@/lib/age';
import { useI18n } from '@/lib/i18n/context';
import { localizedTeamName } from '@/lib/i18n/team-name';
import {
  classifyPosition,
  POSITION_GROUPS,
  type PositionGroup,
} from '@/lib/positions';
import { SQUAD_NOTES } from '@/lib/squad-notes';

type SquadPanelProps = {
  squad: TeamSquad;
};

function ageLabel(dateBorn: string | null, suffix: string): string {
  const age = calcAge(dateBorn);
  return age === null ? '—' : `${age}${suffix}`;
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
  const { locale, dict } = useI18n();
  const { team, coach, players } = squad;
  const grouped = useMemo(() => groupPlayers(players), [players]);
  const squadNoteKey = SQUAD_NOTES[team.fifaCode];

  const isEmpty = !coach && players.length === 0;

  return (
    <div className="wc-squad">
      <Group gap="sm" align="center" wrap="nowrap" mb="xs">
        <CountryFlag fifaCode={team.fifaCode} size="lg" ariaLabel={team.nameJa} />
        <Text fw={700} size="lg">
          {localizedTeamName(team, locale)}
        </Text>
        <Text size="sm" c="dimmed" ff="monospace" style={{ letterSpacing: '0.04em' }}>
          {team.fifaCode}
        </Text>
        <FavoriteStar fifaCode={team.fifaCode} teamName={team.nameJa} size="md" />
      </Group>

      {isEmpty ? (
        <Text c="dimmed" size="sm">
          {dict.squad.empty}
        </Text>
      ) : (
        <Stack gap="md">
          {grouped.map(({ group, label, players: groupPlayersList }) => (
            <div key={group} className="wc-squad-group">
              <Text className="wc-squad-group-title" size="xs" c="dimmed" tt="uppercase">
                {dict.squad.groupCount
                  .replace('{label}', group === 'OTHER' ? dict.squad.positionOther : label)
                  .replace('{count}', String(groupPlayersList.length))}
              </Text>
              <ul className="wc-squad-list">
                {groupPlayersList.map((p) => (
                  <li key={p.id} className="wc-squad-player">
                    <span className="wc-squad-num">{p.number || '—'}</span>
                    <span className="wc-squad-name">
                      {locale === 'ja' ? (p.nameJa ?? p.nameEn) : p.nameEn}
                    </span>
                    <span className="wc-squad-age">{ageLabel(p.dateBorn, dict.squad.ageSuffix)}</span>
                    {/* クラブは2行目に小さく（1行目に入れると選手名が潰れる・旗はノイズなので出さない）。 */}
                    {p.clubName ? (
                      <span className="wc-squad-club">
                        {locale === 'ja' ? (p.clubNameJa ?? p.clubName) : p.clubName}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {coach ? (
            <Group gap="xs" align="center" wrap="wrap">
              <Badge color="yellow" variant="light" radius="sm">
                {dict.squad.coach}
              </Badge>
              {coach.nationalityIso ? (
                <CountryFlag
                  iso={coach.nationalityIso}
                  size="sm"
                  ariaLabel={coach.nationality ?? undefined}
                />
              ) : null}
              <Text fw={600}>
                {locale === 'ja' ? (coach.nameJa ?? coach.nameEn) : coach.nameEn}
              </Text>
            </Group>
          ) : null}

          {/* 現実の名簿事情の注釈（負傷離脱・追加招集など）。
              対象チームと辞書キーの対応は src/lib/squad-notes.ts（1行足すだけで増やせる）。 */}
          {squadNoteKey ? (
            <Text size="xs" c="dimmed" className="wc-squad-note">
              {dict.squad[squadNoteKey]}
            </Text>
          ) : null}
        </Stack>
      )}
    </div>
  );
}
