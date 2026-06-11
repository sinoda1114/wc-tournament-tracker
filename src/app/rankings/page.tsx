import type { Metadata } from 'next';

import { RankingsView } from '@/components/RankingsView';
import { getRankingEvents } from '@/db/match-events';
import { listTournamentMatches } from '@/db/queries';
import { aggregateCards, aggregateScorers, playerTeamKey } from '@/lib/rankings';
import { computeSuspensions, type SuspensionFixture } from '@/lib/suspensions';

// 試合結果・カードが入るたびに集計が変わるので毎回最新を出す。
export const dynamic = 'force-dynamic';

// metadata は他ページと同じく日本語固定（多言語化は T-19 で別途対応）。
export const metadata: Metadata = {
  title: 'ランキング',
  description:
    'WC 2026 の得点ランキングとカード数。記録のある試合から自動集計します。',
  alternates: { canonical: '/rankings' },
};

export default async function RankingsPage() {
  const [events, matches] = await Promise.all([
    getRankingEvents(),
    listTournamentMatches(),
  ]);

  const scorers = aggregateScorers(events);
  const cards = aggregateCards(events);

  // 出場停止を算出してカード行に合流（リセット窓考慮・消化済みは非表示）。
  const fixtures: SuspensionFixture[] = matches.map((m) => ({
    matchDate: m.matchDate,
    status: m.status,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeTeam: m.homeTeam
      ? { fifaCode: m.homeTeam.fifaCode, nameEn: m.homeTeam.nameEn, nameJa: m.homeTeam.nameJa }
      : null,
    awayTeam: m.awayTeam
      ? { fifaCode: m.awayTeam.fifaCode, nameEn: m.awayTeam.nameEn, nameJa: m.awayTeam.nameJa }
      : null,
  }));
  const suspensions = computeSuspensions(events, fixtures);
  const cardsWithSuspension = cards.map((c) => ({
    ...c,
    suspension: suspensions.get(playerTeamKey(c.playerName, c.fifaCode)) ?? null,
  }));

  return <RankingsView scorers={scorers} cards={cardsWithSuspension} />;
}
