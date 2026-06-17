import type { Metadata } from 'next';

import { EarlyBirdPurchase } from '@/components/billing/EarlyBirdPurchase';
import { MiniHero } from '@/components/MiniHero';
import { RankingsView } from '@/components/RankingsView';
import { getRankingEvents } from '@/db/match-events';
import { listTournamentMatches } from '@/db/queries';
import { ogLocale } from '@/lib/i18n/alternates';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';
import { aggregateCards, aggregateScorers, playerTeamKey } from '@/lib/rankings';
import { computeSuspensions, type SuspensionFixture } from '@/lib/suspensions';

// 試合結果・カードが入るたびに集計が変わるので毎回最新を出す。
export const dynamic = 'force-dynamic';

// T-19: ロケール対応 metadata。canonical は単一URL（/rankings）固定で hreflang は付けない。
export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const { title, description } = getDictionary(locale).meta.rankings;
  return {
    title,
    description,
    alternates: { canonical: '/rankings' },
    openGraph: { title, description, url: '/rankings', locale: ogLocale(locale) },
    twitter: { title, description },
  };
}

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

  // 早割先行購入カードはサーバーコンポーネント（auth による自己ゲート）なので、ここで生成して
  // クライアントの RankingsView に slot として渡す（得点と警告の間に配置・T-107）。
  const locale = await resolveLocale();
  const dict = getDictionary(locale);

  return (
    <RankingsView
      scorers={scorers}
      cards={cardsWithSuspension}
      heroSlot={<MiniHero dict={dict} />}
      purchaseSlot={<EarlyBirdPurchase locale={locale} dict={dict} />}
    />
  );
}
