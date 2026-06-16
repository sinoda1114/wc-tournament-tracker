'use client';

import Link from 'next/link';
import { Alert, Anchor, Badge, Group, Stack, Table, Text } from '@mantine/core';

import type { AuditFinding, AuditFindingKind, AuditReport, AuditSeverity } from '@/lib/ingest/audit';

type AdminDataHealthProps = {
  report: AuditReport;
};

const KIND_LABELS: Record<AuditFindingKind, string> = {
  stale_unfinished: '未取込疑い',
  scorers_incomplete: '得点者不足',
  scorers_excess: '得点者過多',
  scorers_side_mismatch: '左右割当ズレ',
  finished_no_subs: '交代0件(TheSportsDBのみ疑い)',
  lineup_missing: '先発XI欠落',
  lineup_partial: '先発XI部分取得',
  lineup_fetch_failed: '先発XI取得失敗',
};

const SEVERITY_COLOR: Record<AuditSeverity, string> = {
  error: 'red',
  warn: 'yellow',
};

const SEVERITY_LABEL: Record<AuditSeverity, string> = {
  error: '要対応',
  warn: '要確認',
};

function FindingRow({ finding }: { finding: AuditFinding }) {
  return (
    <Table.Tr>
      <Table.Td>
        <Anchor component={Link} href={`/admin/matches/${finding.matchId}`}>
          第{finding.matchId}試合
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Badge color={SEVERITY_COLOR[finding.severity]} variant="light">
          {SEVERITY_LABEL[finding.severity]}
        </Badge>
      </Table.Td>
      <Table.Td>{KIND_LABELS[finding.kind]}</Table.Td>
      <Table.Td>
        <Text size="sm">{finding.message}</Text>
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * /admin/health のデータヘルス一覧（T-82）。
 *
 * 監査レポート（鮮度＋整合）を重大度つきで表示し、各所見から該当試合の編集画面へ導線する。
 * 手動 Yahoo 突合に頼らず、未取込・得点者の過不足を一覧で発見できるようにするのが狙い。
 *
 * NOTE: Mantine の compound（Table.* / Badge 等）を含むため `'use client'` に隔離する
 * （Server Component から直接使うと undefined になる既知の罠）。
 */
export function AdminDataHealth({ report }: AdminDataHealthProps) {
  const generatedJst = new Date(report.generatedAt).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
  });

  return (
    <Stack gap="md">
      <Group gap="sm">
        <Badge color="red" variant="light">
          未取込疑い {report.counts.staleUnfinished}
        </Badge>
        <Badge color="yellow" variant="light">
          整合エラー {report.counts.scoreMismatch}
        </Badge>
        <Badge color="orange" variant="light">
          交代0件 {report.counts.finishedNoSubs}
        </Badge>
        <Badge color="grape" variant="light">
          先発XI {report.counts.lineupIssues}
        </Badge>
        <Text size="sm" c="dimmed">
          {report.checkedMatches} 試合を監査・{generatedJst} 時点
        </Text>
      </Group>

      {report.findings.length === 0 ? (
        <Alert color="green" title="所見なし">
          監査対象のデータに未取込・不整合は検出されませんでした。
        </Alert>
      ) : (
        <Table.ScrollContainer minWidth={720}>
          <Table highlightOnHover striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>試合</Table.Th>
                <Table.Th>重大度</Table.Th>
                <Table.Th>種別</Table.Th>
                <Table.Th>内容</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {report.findings.map((finding) => (
                <FindingRow key={`${finding.matchId}-${finding.kind}`} finding={finding} />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}
