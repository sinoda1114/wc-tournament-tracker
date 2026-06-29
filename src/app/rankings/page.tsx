import type { Metadata } from 'next';

import { EarlyBirdPurchase } from '@/components/billing/EarlyBirdPurchase';
import { RankingsView } from '@/components/RankingsView';
import { getRankingEvents } from '@/db/match-events';
import { listTournamentMatches } from '@/db/queries';
import { mergeHistoricalScorers } from '@/lib/historical-scorers';
import { ogLocale } from '@/lib/i18n/alternates';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';
import { aggregateCards, aggregateCountryCards, aggregateCountryGoals, aggregateScorers, currentResetWindow, playerTeamKey, windowOf } from '@/lib/rankings';
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

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const [events, matches, { w }] = await Promise.all([
    getRankingEvents(),
    listTournamentMatches(),
    searchParams,
  ]);

  const scorers = aggregateScorers(events);

  // 大会が現在どの窓まで進んでいるか（W1〜W3）。
  const activeWindow = currentResetWindow(matches);

  // ?w=1|2|3 で過去フェーズの累積カードを振り返れる。範囲外・未指定は現在の窓にフォールバック。
  const requestedWindow = Number(w);
  const targetWindow =
    requestedWindow >= 1 && requestedWindow <= 3 ? requestedWindow : activeWindow;

  // カードのイエロー枚数は targetWindow に属する分だけ数える（WC2026の累積リセット反映・T-101）。
  const cards = aggregateCards(events, targetWindow);

  // 歴代W杯通算得点ランキング（T-109）。静的ベース（〜2022確定）に、現役選手の2026ライブ得点
  // （上の scorers＝同じDB集計）を加算して通算を自動更新する。外部API・手動更新なし。
  const historical = mergeHistoricalScorers(scorers);

  // 出場停止を算出してカード行に合流（pending=🚫 / served=「消化済み」注記で表示）。
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

  // レッドカードはウィンドウリセットの対象外（aggregateCards で全期間集計）だが、
  // 前の窓で消化済みの停止をそのまま表示すると「過去データの持ち越し」に見える。
  // 例: グループステージの退場 → グループ内で消化済み → W2 ビューに表示されてしまう。
  //
  // フィルタ条件: 当該窓のイエローが 0 かつ 停止が「消化済み」の場合、
  // 消化した試合が targetWindow のいずれかの試合日に一致するときのみ表示する。
  // これにより「GL最終戦の退場 → R32 で消化」という持ち越しケースは正しく残る。
  const windowMatchDates = new Set(
    matches
      .filter((m) => windowOf(m.stage) === targetWindow)
      .map((m) => m.matchDate.slice(0, 10)),
  );
  const relevantCards = cardsWithSuspension.filter((c) => {
    if (c.yellow > 0) return true;
    if (c.red === 0) return false;
    const s = c.suspension;
    if (!s) return false;
    if (s.status === 'pending') return true;
    return windowMatchDates.has(s.matchDate.slice(0, 10));
  });

  // 早割先行購入カードはサーバーコンポーネント（auth による自己ゲート）なので、ここで生成して
  // クライアントの RankingsView に slot として渡す（得点と警告の間に配置・T-107）。
  const locale = await resolveLocale();
  const dict = getDictionary(locale);

  return (
    <RankingsView
      scorers={scorers}
      cards={relevantCards}
      historical={historical}
      countryGoals={aggregateCountryGoals(scorers)}
      countryCards={aggregateCountryCards(relevantCards)}
      purchaseSlot={<EarlyBirdPurchase locale={locale} dict={dict} />}
      cardTargetWindow={targetWindow}
      cardActiveWindow={activeWindow}
    />
  );
}
