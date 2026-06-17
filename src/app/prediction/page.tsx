import type { Metadata } from 'next';
import { Container, Stack, Text, Title } from '@mantine/core';

import { EarlyBirdPurchase } from '@/components/billing/EarlyBirdPurchase';
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
  aggregateVotesByStage,
  aliveTeamIdsForStage,
  archivedVotingStages,
  eliminatedTeamIds,
  hasUpcomingVotingStage,
  votableStage,
  VOTING_STAGES,
  type VotingStage,
} from '@/lib/crowd';
import { ogLocale } from '@/lib/i18n/alternates';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';

// T-19: ロケール対応 metadata。canonical は単一URL（/prediction）固定で hreflang は付けない。
export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const { title, description } = getDictionary(locale).meta.prediction;
  return {
    title,
    description,
    alternates: { canonical: '/prediction' },
    openGraph: { title, description, url: '/prediction', locale: ogLocale(locale) },
    twitter: { title, description },
  };
}

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
  const now = new Date();

  // 決勝トーナメント投票（投票パネル）は課金壁の対象。サーバ判定（クライアント詐称不可）。
  // 無料期間中は誰でも解放、決勝T突入後は「購入済み or 72h救済」のみ解放。
  // それ以外は VotePanel の代わりに PaywallLock を出す。group_stage 投票は無料（T-51）。
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

  // 優勝予想は常設。敗退が確定したチームはグレー化（選択不可）にするため ID を渡す。
  const eliminatedIds = [...eliminatedTeamIds(matches)];

  // 投票パネル用：いま投票できるステージ（open＝次ステージ未開始）と候補（生存チーム）、自分の既投票。
  const stage = votableStage(matches, now);
  // 投票不可(stage=null)のとき、次ステージの出場国確定待ち（移行中）か、全ステージ終了かを区別する。
  // 移行中なら「まもなく開始」、全終了なら「締め切られました」を VotePanel が出し分ける。
  const closedSoon = stage === null && hasUpcomingVotingStage(matches, now);
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

  // アーカイブ：過去ラウンドの投票結果を消さずに履歴として閲覧できるようにする。
  const teamMetaById = new Map(
    teamRatings.map((t) => [
      t.id,
      { id: t.id, nameJa: t.nameJa, nameEn: t.nameEn, fifaCode: t.fifaCode },
    ]),
  );
  const archivedStages: VotingStage[] = archivedVotingStages(matches, now);
  const archives = archivedStages.map((archStage) => {
    const counts = aggregateVotesByStage(votes, archStage);
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    const results = [...counts.entries()]
      .map(([teamId, count]) => ({
        team: teamMetaById.get(teamId) ?? null,
        teamId,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { stage: archStage, label: dict.match.stage[archStage], total, results };
  });

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
          eliminatedIds={eliminatedIds}
        />

        {/* 無料期間中の早割先行購入導線（自己ゲート：無料期間中＆未購入のときだけ出る）。 */}
        <EarlyBirdPurchase locale={locale} dict={dict} />

        {access.hasAccess ? (
          <VotePanel
            stage={stage}
            stageLabel={stage ? dict.match.stage[stage] : null}
            nextStageLabel={nextStageLabel}
            candidates={candidates}
            myVoteTeamId={myVoteTeamId}
            archives={archives}
            closedSoon={closedSoon}
          />
        ) : (
          <PaywallLock locale={locale} dict={dict} />
        )}
      </Stack>
    </Container>
  );
}
