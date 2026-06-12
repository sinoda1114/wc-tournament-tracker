import type { Metadata } from 'next';
import { Container, Stack, Text, Title } from '@mantine/core';

import { PaywallLock } from '@/components/billing/PaywallLock';
import { ChampionPrediction } from '@/components/ChampionPrediction';
import { VotePanel } from '@/components/VotePanel';
import { resolveAccess } from '@/lib/billing/access';
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
  VOTING_STAGES,
} from '@/lib/crowd';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '優勝国予想',
  description:
    '過去W杯成績・FIFAランク・WC2026成績・みんなの予想を掛け合わせて優勝確率を算出します。指標のON/OFFで予想が変わります。',
  alternates: { canonical: '/prediction' },
};

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

  const locale = await resolveLocale();
  const dict = getDictionary(locale);

  // 決勝T関連（投票パネル＝決勝T投票）は課金壁の対象。
  // サーバ判定（クライアント詐称不可）。無料期間中は誰でも解放、決勝T突入後は
  // 「購入済み or 72h救済」のみ解放。それ以外は VotePanel の代わりに PaywallLock を出す。
  const access = await resolveAccess();

  // ③2026成績は matches から、④みんなの予想は投票からライブ計算される。
  const crowdCounts = aggregateLatestVotes(votes);
  const factors = computeFactorScores(teamRatings, matches, crowdCounts);
  const predictionTeams = teamRatings.map((t) => ({
    id: t.id,
    nameJa: t.nameJa,
    nameEn: t.nameEn,
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
      ? dict.match.stage[VOTING_STAGES[stageIndex + 1]]
      : null;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>{dict.prediction.title}</Title>
          <Text c="dimmed">{dict.prediction.description}</Text>
        </Stack>

        <ChampionPrediction
          teams={predictionTeams}
          factors={serializeFactors(factors)}
        />

        {access.hasAccess ? (
          <VotePanel
            stage={stage}
            stageLabel={stage ? dict.match.stage[stage] : null}
            nextStageLabel={nextStageLabel}
            candidates={candidates}
            myVoteTeamId={myVoteTeamId}
          />
        ) : (
          <PaywallLock locale={locale} dict={dict} />
        )}
      </Stack>
    </Container>
  );
}
