import { Container, Stack, Text, Title } from '@mantine/core';

import { ChampionPrediction } from '@/components/ChampionPrediction';
import { VotePanel } from '@/components/VotePanel';
import {
  getMyVotes,
  listCrowdVotes,
  listTeamRatings,
  listTournamentMatches,
} from '@/db/queries';
import { computeFactorScores, type FactorKey } from '@/lib/champion-prediction';
import {
  aggregateLatestVotes,
  aliveTeamIdsForStage,
  currentVotingStage,
  STAGE_LABELS,
  VOTING_STAGES,
} from '@/lib/crowd';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';

/** Map は RSC 境界を越えられないため、クライアントへはプレーンオブジェクトで渡す。 */
function serializeFactors(
  factors: ReturnType<typeof computeFactorScores>,
): Record<FactorKey, Record<string, number>> {
  return {
    pastWorldCup: Object.fromEntries(factors.pastWorldCup),
    fifaRank: Object.fromEntries(factors.fifaRank),
    wc2026: Object.fromEntries(factors.wc2026),
    crowd: Object.fromEntries(factors.crowd),
  };
}

export default async function PredictionPage() {
  const [matches, teamRatings, votes, voterId] = await Promise.all([
    listTournamentMatches(),
    listTeamRatings(),
    listCrowdVotes(),
    readVoterId(),
  ]);

  // ③2026成績は matches から、④みんなの予想は投票からライブ計算される。
  const crowdCounts = aggregateLatestVotes(votes);
  const factors = computeFactorScores(teamRatings, matches, crowdCounts);
  const predictionTeams = teamRatings.map((t) => ({
    id: t.id,
    nameJa: t.nameJa,
    fifaCode: t.fifaCode,
  }));

  // 投票パネル用：現在ステージと候補（生存チーム）、自分の既投票。
  const stage = currentVotingStage(matches);
  const aliveIds = stage ? new Set(aliveTeamIdsForStage(matches, stage)) : new Set<string>();
  const candidates = teamRatings
    .filter((t) => aliveIds.has(t.id))
    .map((t) => ({ id: t.id, nameJa: t.nameJa, nameEn: t.nameEn, fifaCode: t.fifaCode }))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en'));
  const myVotes = voterId ? await getMyVotes(voterId) : {};
  const myVoteTeamId = stage ? myVotes[stage] ?? null : null;

  // 次の投票ステージ名（投票済み時に「次はいつ投票できるか」を案内する）。
  const stageIndex = stage ? VOTING_STAGES.indexOf(stage) : -1;
  const nextStageLabel =
    stageIndex >= 0 && stageIndex < VOTING_STAGES.length - 1
      ? STAGE_LABELS[VOTING_STAGES[stageIndex + 1]]
      : null;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>優勝国予想</Title>
          <Text c="dimmed">
            過去W杯成績・FIFAランク・WC2026成績・みんなの予想を掛け合わせて優勝確率を算出します。指標のON/OFFで予想が変わります。
          </Text>
        </Stack>

        <ChampionPrediction
          teams={predictionTeams}
          factors={serializeFactors(factors)}
        />

        <VotePanel
          stage={stage}
          stageLabel={stage ? STAGE_LABELS[stage] : null}
          nextStageLabel={nextStageLabel}
          candidates={candidates}
          myVoteTeamId={myVoteTeamId}
        />
      </Stack>
    </Container>
  );
}
