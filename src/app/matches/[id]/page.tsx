import { Suspense } from 'react';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge, Container, Group, Stack, Text, Title } from '@mantine/core';

import { JsonLd } from '@/components/JsonLd';
import { MatchEvents } from '@/components/MatchEvents';
import { MatchPitch } from '@/components/MatchPitch';
import { MatchVersus } from '@/components/MatchVersus';
import { VenueInfoCard } from '@/components/VenueInfoCard';
import { VenueWeather } from '@/components/VenueWeather';
import { PaywallLock } from '@/components/billing/PaywallLock';
import { getMatchEvents } from '@/db/match-events';
import { getMatchDetail, getTeamSquad, getVenueMatchSummary } from '@/db/queries';
import { hasKnockoutAccess } from '@/lib/billing/access';
import {
  formatKickoff,
  formatMatchDateZoned,
  formatSlotLabel,
  type MatchStage,
} from '@/lib/bracket';
import { getSiteUrl } from '@/lib/env';
import { fetchMatchLineup, shortLatinName, type MatchLineup } from '@/lib/lineup/wikipedia-lineup';
import { ogLocale } from '@/lib/i18n/alternates';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale, resolveTimeZone } from '@/lib/i18n/server';
import { localizedTeamName } from '@/lib/i18n/team-name';
import { buildBreadcrumbList, buildSportsEvent } from '@/lib/structured-data';
import { tzOffset } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

type MatchDetailPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 対戦カード・ステージを反映した動的メタデータ。
 * 確定前カードはスロット名（「勝者 #51」等）で説明し、未確定でも妥当なタイトルにする。
 * T-19: 表示言語に応じたチーム名・スロット名・ステージ名・テンプレを使う。
 * canonical は単一URL（/matches/<id>）固定で hreflang は付けない。
 */
export async function generateMetadata({
  params,
}: MatchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await resolveLocale();
  const dict = getDictionary(locale);
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) {
    return { title: dict.meta.matchDetail.fallback };
  }

  const match = await getMatchDetail(matchId);
  if (!match) {
    return { title: dict.meta.matchDetail.fallback };
  }

  // チームが確定していればロケール化名、未確定ならスロット名（言語対応）。
  const homeLabel =
    localizedTeamName(match.homeTeam, locale) ||
    formatSlotLabel(match.homeSlot, dict.match.slot);
  const awayLabel =
    localizedTeamName(match.awayTeam, locale) ||
    formatSlotLabel(match.awaySlot, dict.match.slot);
  const stageLabel = dict.match.stage[match.stage as MatchStage] ?? match.stage;
  const tmpl = dict.meta.matchDetail;
  const title = tmpl.title
    .replace('{home}', homeLabel)
    .replace('{away}', awayLabel)
    .replace('{stage}', stageLabel);
  const description = tmpl.description
    .replace('{home}', homeLabel)
    .replace('{away}', awayLabel)
    .replace('{stage}', stageLabel)
    .replace('{stadium}', match.venue.stadiumName)
    .replace('{city}', match.venue.city);
  const canonical = `/matches/${match.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      locale: ogLocale(locale),
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = await params;
  const matchId = Number(id);

  if (!Number.isInteger(matchId)) {
    notFound();
  }

  const match = await getMatchDetail(matchId);

  if (!match) {
    notFound();
  }

  const locale = await resolveLocale();
  const dict = getDictionary(locale);

  // 決勝T課金壁（T-68 面③）: 試合詳細は未購入×決勝T期間では出さず PaywallLock に差し替える。
  // 重い取得（先発XI/イベント/天気）の前に早期 return し、無駄な取得も避ける。
  if (!(await hasKnockoutAccess())) {
    return (
      <Container size="md" py="xl">
        <PaywallLock locale={locale} dict={dict} />
      </Container>
    );
  }

  const timeZone = await resolveTimeZone();
  const stageLabel = dict.match.stage[match.stage as MatchStage] ?? match.stage;
  // グループリーグの試合は「どのグループか（グループA 等）」を併記する。
  const groupLabel =
    match.stage === 'group_stage' && match.groupLetter
      ? dict.groups.groupHeading.replace('{letter}', match.groupLetter)
      : null;
  const kickoff = formatKickoff(match.kickoffAt, timeZone);
  const kickoffAbbrev = match.kickoffAt ? tzOffset(timeZone, new Date(match.kickoffAt)) : '';
  const venueSummary = await getVenueMatchSummary(match.venueId);
  const events = await getMatchEvents(match.id);

  // T-87/T-92: グループ戦 + 決勝Tの先発XIを Wikipedia から取得しピッチ表示。
  // 先発XIを期待できるカード（両チーム確定済み）かを先に判定しておき、
  // 取得できなかったときに「未反映」を静かに示すために使う（無言で消えるのを防ぐ）。
  const lineupExpected = Boolean(match.homeTeam?.nameEn && match.awayTeam?.nameEn);

  let lineup: MatchLineup | null = null;
  if (lineupExpected && match.homeTeam?.nameEn && match.awayTeam?.nameEn) {
    try {
      // 取得失敗（ネットワーク等）でページ全体を落とさないよう握りつぶすが、
      // T-92: サイレントにせず原因をサーバログに残す（本番で非表示の理由を追えるように）。
      lineup = await fetchMatchLineup({
        home: { nameEn: match.homeTeam.nameEn, fifaCode: match.homeTeam.fifaCode },
        away: { nameEn: match.awayTeam.nameEn, fifaCode: match.awayTeam.fifaCode },
        groupLetter: match.groupLetter,
        stage: match.stage,
      });
    } catch (error) {
      const stageInfo = match.groupLetter ?? match.stage;
      console.error(
        `[match ${match.id}] fetchMatchLineup failed (${stageInfo}, ${match.homeTeam.nameEn} vs ${match.awayTeam.nameEn})`,
        error,
      );
      lineup = null;
    }
  }

  // 表示名のローカライズ: ja は背番号で自国スカッドの日本語名に解決、無ければ英語姓へ短縮。
  if (lineup && match.homeTeam && match.awayTeam) {
    const [homeSquad, awaySquad] = await Promise.all([
      getTeamSquad(match.homeTeam.fifaCode).catch(() => null),
      getTeamSquad(match.awayTeam.fifaCode).catch(() => null),
    ]);
    const jaByNumber = (squad: Awaited<ReturnType<typeof getTeamSquad>>): Map<number, string> => {
      const map = new Map<number, string>();
      squad?.players.forEach((p) => {
        if (p.number == null || !p.nameJa) return;
        const n = Number(p.number);
        if (Number.isFinite(n)) map.set(n, p.nameJa);
      });
      return map;
    };
    const homeJa = jaByNumber(homeSquad);
    const awayJa = jaByNumber(awaySquad);
    const localize = (players: MatchLineup['home'], jaMap: Map<number, string>) =>
      players.map((p) => {
        const ja = p.number != null ? jaMap.get(p.number) : undefined;
        if (locale === 'ja' && ja) {
          const captain = / \(c\)$/.test(p.name) ? ' (c)' : '';
          return { ...p, name: ja + captain };
        }
        return { ...p, name: shortLatinName(p.name) };
      });
    lineup = { home: localize(lineup.home, homeJa), away: localize(lineup.away, awayJa) };
  }

  // 構造化データ: 試合 = SportsEvent、ナビ階層 = BreadcrumbList。
  const baseUrl = getSiteUrl();
  const jsonLd = [
    buildSportsEvent(baseUrl, match),
    buildBreadcrumbList(baseUrl, [
      { name: 'トップ', path: '/' },
      { name: stageLabel, path: `/matches/${match.id}` },
    ]),
  ];

  return (
    <Container size="md" py="xl">
      <JsonLd data={jsonLd} />
      <Stack gap="lg">
        <Stack gap={6}>
          <Text c="dimmed">{dict.matchDetail.number.replace('{n}', String(match.id))}</Text>
          <Title order={1}>{groupLabel ? `${stageLabel} · ${groupLabel}` : stageLabel}</Title>
          <Group gap="sm">
            <Badge variant="light">{formatMatchDateZoned(match, timeZone, dict.match.weekdays)}</Badge>
            {kickoff ? (
              <Badge variant="light" color="blue" title={timeZone}>
                {kickoff} {kickoffAbbrev}
              </Badge>
            ) : null}
            {match.status === 'finished' ? (
              <Badge color="green">{dict.match.status.finished}</Badge>
            ) : match.status === 'in_progress' ? (
              <span className="wc-live-badge wc-live-badge--lg" aria-label={dict.match.status.in_progress}>
                {dict.match.status.in_progress}
              </span>
            ) : null}
          </Group>
        </Stack>

        <Stack
          p="lg"
          style={{
            border: '1px solid var(--wc-border)',
            borderRadius: 16,
            background: 'var(--wc-surface)',
          }}
        >
          <MatchVersus match={match} nameMode="full" size="md" />
        </Stack>

        {lineup && match.homeTeam && match.awayTeam ? (
          <MatchPitch
            lineup={lineup}
            home={{ name: localizedTeamName(match.homeTeam, locale), fifaCode: match.homeTeam.fifaCode }}
            away={{ name: localizedTeamName(match.awayTeam, locale), fifaCode: match.awayTeam.fifaCode }}
          />
        ) : lineupExpected && match.status !== 'scheduled' ? (
          // T-92: 先発XIを期待できるカード（実施中/終了）で取得できなかったとき、無言で消えず控えめに状態を示す。
          // 未開催(scheduled)はそもそも未掲載が自然なのでノートを出さない（一時障害と紛らわしくしない）。
          <Text size="sm" c="dimmed">
            {dict.matchDetail.lineupPending}
          </Text>
        ) : null}

        <MatchEvents events={events} match={match} dict={dict} locale={locale} />

        <VenueInfoCard venue={match.venue} summary={venueSummary} locale={locale} dict={dict} />

        <Suspense fallback={null}>
          <VenueWeather
            matchId={match.id}
            venueId={match.venueId}
            matchDate={match.matchDate}
            kickoffAt={match.kickoffAt}
            dateLabel={formatMatchDateZoned(match, timeZone, dict.match.weekdays)}
            locale={locale}
            dict={dict}
          />
        </Suspense>
      </Stack>
    </Container>
  );
}
