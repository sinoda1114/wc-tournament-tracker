'use client';

import Link from 'next/link';
import { Table, Text } from '@mantine/core';

import type { MatchDetail } from '@/db/queries';
import {
  STAGE_LABELS,
  STATUS_LABELS,
  formatMatchDateJst,
  getParticipantLabel,
  type MatchStage,
} from '@/lib/bracket';

type AdminMatchTableProps = {
  matches: MatchDetail[];
};

/**
 * 管理画面の試合一覧テーブル。
 *
 * NOTE: Mantine の compound components（`Table.Thead` などのドット記法）は
 * Server Component から直接使うと RSC の client 変換でサブプロパティが落ち
 * "Element type is invalid (undefined)" になる。そのため Table 描画はこの
 * `'use client'` コンポーネントに隔離し、`admin/page.tsx`（Server）は
 * データ取得と受け渡しだけを担う。
 */
export function AdminMatchTable({ matches }: AdminMatchTableProps) {
  return (
    <Table.ScrollContainer minWidth={900}>
      <Table highlightOnHover striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>試合</Table.Th>
            <Table.Th>ステージ</Table.Th>
            <Table.Th>日付</Table.Th>
            <Table.Th>対戦</Table.Th>
            <Table.Th>スコア</Table.Th>
            <Table.Th>状態</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {matches.map((match) => {
            const stageLabel =
              STAGE_LABELS[match.stage as MatchStage] ?? match.stage;
            const score =
              match.homeScore !== null && match.awayScore !== null
                ? `${match.homeScore} - ${match.awayScore}`
                : '-';

            return (
              <Table.Tr key={match.id}>
                <Table.Td>第{match.id}試合</Table.Td>
                <Table.Td>{stageLabel}</Table.Td>
                <Table.Td>{formatMatchDateJst(match)}</Table.Td>
                <Table.Td>
                  {getParticipantLabel(match.homeTeam, match.homeSlot)}
                  <br />
                  vs
                  <br />
                  {getParticipantLabel(match.awayTeam, match.awaySlot)}
                </Table.Td>
                <Table.Td>{score}</Table.Td>
                <Table.Td>{STATUS_LABELS[match.status]}</Table.Td>
                <Table.Td>
                  <Text
                    component={Link}
                    href={`/admin/matches/${match.id}`}
                    fw={600}
                  >
                    編集
                  </Text>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
