'use client';

import { Button, Container, Drawer, Stack, Table, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { CountryFlag } from '@/components/CountryFlag';
import type { ResolvedHistoricalScorer } from '@/lib/historical-scorers';
import type { Locale } from '@/lib/i18n/config';
import { useI18n } from '@/lib/i18n/context';
import type { Dictionary } from '@/lib/i18n/dictionary';
import {
  standardCompetitionRanks,
  type CardStat,
  type CardSuspension,
  type CountryCardStat,
  type CountryGoalStat,
  type ScorerStat,
} from '@/lib/rankings';

type RankingsViewProps = {
  scorers: ScorerStat[];
  cards: CardStat[];
  countryGoals: CountryGoalStat[];
  countryCards: CountryCardStat[];
  /** 歴代W杯通算得点ランキング（T-109）。静的ベース＋2026ライブ得点を合算済み（page で解決）。 */
  historical: ResolvedHistoricalScorer[];
  /**
   * 得点ランキングと警告カードランキングの間に差し込むノード（早割購入カード・T-107）。
   * RankingsView はクライアントなので、サーバーコンポーネント（EarlyBirdPurchase）は
   * 直接 import せず、サーバー側（page）で生成して slot として受け取る。
   */
  purchaseSlot?: ReactNode;
  /** 現在表示しているリセット窓（1=グループ / 2=決勝T〜QF / 3=SF〜Final）。 */
  cardTargetWindow: number;
  /** 大会が現在進行しているリセット窓の最大値（未到達フェーズをグレーアウトするために使う）。 */
  cardActiveWindow: number;
};

const PREVIEW_LIMIT = 10;
/** 歴代ランキングは本体は上位5名。全件は引き出しドロワー（T-109）。 */
const HISTORICAL_PREVIEW = 5;
const CHART_PREVIEW = 8;

type TeamLike = { fifaCode: string | null; nameEn: string | null; nameJa: string | null };

function teamLabel(team: TeamLike, locale: Locale): string {
  if (locale === 'ja') return team.nameJa ?? team.nameEn ?? team.fifaCode ?? '';
  return team.nameEn ?? team.fifaCode ?? '';
}

/** 国旗＋国名のセル。チーム未確定（fifaCode 無し）は控えめなダッシュ。 */
function TeamCell({ team, locale }: { team: TeamLike; locale: Locale }) {
  if (!team.fifaCode) {
    return (
      <Text component="span" c="dimmed" size="sm">
        —
      </Text>
    );
  }
  return (
    <span className="wc-ranking-team">
      <CountryFlag fifaCode={team.fifaCode} size="sm" ariaLabel={teamLabel(team, locale)} />
      <Text component="span" size="sm">
        {teamLabel(team, locale)}
      </Text>
    </span>
  );
}

/** イエロー/レッドカードのアイコン（小さなカード型の矩形）。視認性のため列見出しに使う。 */
function CardGlyph({ color }: { color: 'yellow' | 'red' }) {
  const fill = color === 'yellow' ? '#eab308' : '#dc2626';
  return (
    <svg
      width={11}
      height={15}
      viewBox="0 0 11 15"
      aria-hidden
      focusable={false}
      style={{ verticalAlign: 'middle' }}
    >
      <rect x={0.5} y={0.5} width={10} height={14} rx={1.5} fill={fill} />
    </svg>
  );
}

/** YYYY-MM-DD... を M/D に整形（表示用）。 */
function formatMonthDay(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** 出場停止アイコン（🚫 no-entry）。次戦情報を aria-label/title に渡してA11yを担保（T-65）。 */
function SuspensionGlyph({ label }: { label: string }) {
  return (
    <span className="wc-ranking-susp-icon" role="img" aria-label={label} title={label}>
      🚫
    </span>
  );
}

/**
 * 出場停止セル。状態で表示を分岐する（T-65 / 消化済み表記）。
 * - pending: 🚫 ＋ 次戦（M/D vs 対戦相手）。現在出場停止中。
 * - served : 「出場停止 消化済み（M/D vs 対戦相手）」。赤は通算で一覧に残るため、
 *   消化した事実を注記で示す（🚫 は使わない＝もう停止ではないため）。
 * - 無し   : ダッシュ。
 * 情報を失わないよう対象試合テキストは残し、aria-label/title に状態込みのテキストを付ける。
 */
function SuspensionCell({
  suspension,
  locale,
  t,
}: {
  suspension: CardSuspension | null | undefined;
  locale: Locale;
  t: Dictionary['rankings'];
}) {
  if (!suspension) {
    return (
      <Text component="span" c="dimmed" size="sm">
        —
      </Text>
    );
  }
  const opponentLabel = suspension.opponent ? teamLabel(suspension.opponent, locale) : t.tbd;
  const targetMatch = `${formatMonthDay(suspension.matchDate)} vs ${opponentLabel}`;

  if (suspension.status === 'served') {
    // 消化済み：🚫 ではなくテキスト注記。例: 「出場停止 消化済み（6/18 vs チェコ）」。
    const servedLabel = `${t.suspensionServed}（${targetMatch}）`;
    return (
      <Text
        component="span"
        size="xs"
        c="dimmed"
        className="wc-ranking-susp-served"
        title={servedLabel}
      >
        {servedLabel}
      </Text>
    );
  }

  // pending：現在出場停止中。例: 「出場停止（6/24 vs 韓国）」をアイコン代替テキストに。
  const ariaLabel = `${t.suspended}（${targetMatch}）`;
  return (
    <span className="wc-ranking-susp">
      <SuspensionGlyph label={ariaLabel} />
      <Text component="span" size="xs" c="dimmed">
        {targetMatch}
      </Text>
    </span>
  );
}

function RankingPreviewMeta({ shown, total, label }: { shown: number; total: number; label: string }) {
  if (total <= shown) return null;
  return (
    <Text c="dimmed" size="xs" className="wc-ranking-preview-meta">
      {label.replace('{shown}', String(shown)).replace('{total}', String(total))}
    </Text>
  );
}

/** 2026大会に現役出場中を示す小バッジ（緑ドット＋短ラベル）。aria でテキスト相当を渡す（T-109）。 */
function ActiveBadge({ label, ariaLabel }: { label: string; ariaLabel: string }) {
  return (
    <span className="wc-active-badge" role="img" aria-label={ariaLabel} title={ariaLabel}>
      <span className="wc-active-badge-dot" aria-hidden />
      {label}
    </span>
  );
}

/** 「引き出し（ドロワー）で開く」ことを示すグリフ。右からスライドする小パネルのイメージ（T-109）。 */
function DrawerGlyph() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden focusable={false}>
      <rect
        x={0.75}
        y={1.75}
        width={12.5}
        height={10.5}
        rx={1.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
      />
      <line x1={9} y1={1.75} x2={9} y2={12.25} stroke="currentColor" strokeWidth={1.2} />
      <path
        d="M3.5 5.5 L5.5 7 L3.5 8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const STAGE_LABEL_KEY: Record<string, keyof Dictionary['rankings']> = {
  group_stage: 'stageGroupStage',
  round_of_32: 'stageR32',
  round_of_16: 'stageR16',
  quarter_final: 'stageQF',
  semi_final: 'stageSF',
  third_place: 'stageThirdPlace',
  final: 'stageFinal',
};

/** 国別カード累積 横棒グラフ（T-118 再設計）。国ごとの黄/赤を積み上げ表示。 */
function CountryCardChart({ data, t, title, locale }: { data: CountryCardStat[]; t: Dictionary['rankings']; title: string; locale: Locale }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.yellow + d.red), 1);
  return (
    <div className="wc-chart">
      {title && <Text size="sm" fw={600} mb="xs">{title}</Text>}
      <div className="wc-chart-rows">
        {data.map((c) => {
          const countryLabel = locale === 'ja' ? (c.nameJa ?? c.nameEn ?? '') : (c.nameEn ?? '');
          return (
            <div key={c.fifaCode ?? c.nameEn ?? ''} className="wc-chart-row" aria-label={`${countryLabel}: ${t.colYellowAria} ${c.yellow}, ${t.colRedAria} ${c.red}`}>
              <div className="wc-chart-label">
                {c.fifaCode && <CountryFlag fifaCode={c.fifaCode} size="sm" ariaLabel={countryLabel} />}
                <Text size="xs" className="wc-chart-label-text">
                  {locale === 'ja' ? c.nameJa ?? c.nameEn : c.nameEn}
                </Text>
              </div>
              <div className="wc-chart-bar-wrap">
                <div className="wc-chart-bar-stacked" aria-hidden>
                  {c.yellow > 0 && (
                    <div className="wc-chart-bar wc-chart-bar--yellow" style={{ width: `${(c.yellow / max) * 100}%` }}>
                      <span className="wc-chart-bar-label">{c.yellow}</span>
                    </div>
                  )}
                  {c.red > 0 && (
                    <div className="wc-chart-bar wc-chart-bar--red" style={{ width: `${(c.red / max) * 100}%` }}>
                      <span className="wc-chart-bar-label wc-chart-bar-label--red">{c.red}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="wc-chart-legend">
        <span className="wc-chart-legend-dot wc-chart-legend-dot--yellow" aria-hidden />
        <Text size="xs" c="dimmed">{t.colYellowAria}</Text>
        <span className="wc-chart-legend-dot wc-chart-legend-dot--red" aria-hidden />
        <Text size="xs" c="dimmed">{t.colRedAria}</Text>
      </div>
    </div>
  );
}

/** 歴代得点者の国セル（国旗＋英語国名）。歴史国（西ドイツ等）は現代継承国の旗で代替（T-109）。 */
function HistoricalTeamCell({ country, fifaCode }: { country: string; fifaCode: string }) {
  return (
    <span className="wc-ranking-team">
      <CountryFlag fifaCode={fifaCode} size="sm" ariaLabel={country} />
      <Text component="span" size="sm">
        {country}
      </Text>
    </span>
  );
}

const PHASE_WINDOWS = [1, 2, 3] as const;

/** 累積カードのリセット窓切り替えタブ。 */
function CardPhaseTabs({
  targetWindow,
  activeWindow,
  t,
}: {
  targetWindow: number;
  activeWindow: number;
  t: Dictionary['rankings'];
}) {
  const phaseLabels: Record<number, string> = {
    1: t.cardPhaseW1,
    2: t.cardPhaseW2,
    3: t.cardPhaseW3,
  };

  return (
    <div className="wc-card-phase-tabs" role="tablist" aria-label={t.cardsTitle}>
      {PHASE_WINDOWS.map((w) => {
        const label = phaseLabels[w];
        const isCurrent = w === targetWindow;
        const isAvailable = w <= activeWindow;

        if (!isAvailable) {
          return (
            <span
              key={w}
              className="wc-card-phase-tab wc-card-phase-tab--disabled"
              aria-disabled="true"
              title={t.cardPhaseNotStarted}
            >
              {label}
            </span>
          );
        }

        if (isCurrent) {
          return (
            <span
              key={w}
              className="wc-card-phase-tab wc-card-phase-tab--active"
              role="tab"
              aria-selected="true"
            >
              {label}
              {w === activeWindow && (
                <span className="wc-card-phase-tab-current">{t.cardPhaseCurrent}</span>
              )}
            </span>
          );
        }

        return (
          <Link
            key={w}
            href={`/rankings?w=${w}`}
            className="wc-card-phase-tab wc-card-phase-tab--link"
            role="tab"
            aria-selected="false"
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export function RankingsView({
  scorers,
  cards,
  historical,
  countryGoals,
  countryCards,
  purchaseSlot,
  cardTargetWindow,
  cardActiveWindow,
}: RankingsViewProps) {
  const { locale, dict } = useI18n();
  const t = dict.rankings;
  const [drawer, setDrawer] = useState<'scorers' | 'cards' | 'historical' | 'countryGoals' | 'countryCards' | null>(null);

  const isEmpty = scorers.length === 0 && cards.length === 0;

  // 同点同順位（標準競争順位）を値ベースで算出（T-63）。並びは現状維持。
  const scorerRanks = standardCompetitionRanks(scorers, (s) => s.goals);
  // カードランキングはソート基準（赤→黄）に合わせ、合成キー値で同順位を判定。
  const cardRanks = standardCompetitionRanks(cards, (c) => c.red * 1000 + c.yellow);
  const previewScorers = scorers.slice(0, PREVIEW_LIMIT);
  // 国別得点ランキング
  const countryGoalRanks = standardCompetitionRanks(countryGoals, (cg) => cg.goals);
  const previewCountryGoals = countryGoals.slice(0, CHART_PREVIEW);
  const previewCards = cards.slice(0, PREVIEW_LIMIT);
  // 歴代は通算得点で同点同順位を算出（既存ユーティリティ再利用）。本体は上位3名、全件はドロワー。
  const historicalRanks = standardCompetitionRanks(historical, (h) => h.goals);
  const previewHistorical = historical.slice(0, HISTORICAL_PREVIEW);

  // 歴代得点の注記。2文目（緑文）は改行して、得点列の「+N」と同じ teal.4 で表示し
  // 「緑＝本大会得点」を実データと視覚的にリンクさせる（プレビュー/ドロワー共通）。
  const historicalNoteNode = (
    <>
      {t.historicalNote}
      <br />
      <Text component="span" c="teal.4" fw={600}>
        {t.historicalNoteLive}
      </Text>
    </>
  );

  const renderCountryGoalTable = (rows: CountryGoalStat[], ranks: number[]) => (
    <Table className="wc-ranking-table" highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th aria-label={t.colRank}>{t.colRank}</Table.Th>
          <Table.Th>{t.colTeam}</Table.Th>
          <Table.Th ta="right">{t.colGoals}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((cg, i) => (
          <Table.Tr key={cg.fifaCode ?? cg.nameEn ?? i}>
            <Table.Td>{ranks[i]}</Table.Td>
            <Table.Td>
              <TeamCell team={cg} locale={locale} />
            </Table.Td>
            <Table.Td ta="right" fw={700}>
              {cg.goals}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  const renderScorerTable = (rows: ScorerStat[], ranks: number[]) => (
    <Table className="wc-ranking-table" highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th aria-label={t.colRank}>{t.colRank}</Table.Th>
          <Table.Th>{t.colPlayer}</Table.Th>
          <Table.Th>{t.colTeam}</Table.Th>
          <Table.Th ta="right">{t.colGoals}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((s, i) => (
          <Table.Tr key={`${s.playerName}-${s.fifaCode ?? ''}-${i}`}>
            <Table.Td>{ranks[i]}</Table.Td>
            <Table.Td>{s.playerName}</Table.Td>
            <Table.Td>
              <TeamCell team={s} locale={locale} />
            </Table.Td>
            <Table.Td ta="right" fw={700}>
              {s.goals}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  const renderHistoricalTable = (rows: ResolvedHistoricalScorer[], ranks: number[]) => (
    <Table className="wc-ranking-table" highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th aria-label={t.colRank}>{t.colRank}</Table.Th>
          <Table.Th>{t.colPlayer}</Table.Th>
          <Table.Th>{t.colTeam}</Table.Th>
          <Table.Th>{t.colSpan}</Table.Th>
          <Table.Th ta="right">{t.colGoals}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((h, i) => (
          <Table.Tr key={`${h.name}-${i}`}>
            <Table.Td>{ranks[i]}</Table.Td>
            <Table.Td>
              <span className="wc-historical-player">
                <Text component="span" size="sm">
                  {h.name}
                </Text>
                {h.active2026 ? (
                  <ActiveBadge label={t.activeBadge} ariaLabel={t.activeBadgeAria} />
                ) : null}
              </span>
            </Table.Td>
            <Table.Td>
              <HistoricalTeamCell country={h.country} fifaCode={h.fifaCode} />
            </Table.Td>
            <Table.Td>
              <Text component="span" size="xs" c="dimmed">
                {h.span}
              </Text>
            </Table.Td>
            <Table.Td ta="right" fw={700}>
              {h.goals}
              {h.liveGoals2026 > 0 ? (
                // 緑の「+N」は通算(h.goals)に「含まれる」本大会得点。足し直しではないことを
                // title/aria で明示し、「16 +3 = 19」と誤読されないようにする。
                <Text
                  component="span"
                  size="xs"
                  c="teal.4"
                  ml={4}
                  title={t.historicalLiveHint.replace('{n}', String(h.liveGoals2026))}
                  aria-label={t.historicalLiveHint.replace('{n}', String(h.liveGoals2026))}
                >
                  +{h.liveGoals2026}
                </Text>
              ) : null}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  const renderCardTable = (rows: CardStat[], ranks: number[]) => (
    <Table className="wc-ranking-table" highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th aria-label={t.colRank}>{t.colRank}</Table.Th>
          <Table.Th>{t.colPlayer}</Table.Th>
          <Table.Th>{t.colTeam}</Table.Th>
          <Table.Th ta="right" title={t.colYellowAria} aria-label={t.colYellowAria}>
            <CardGlyph color="yellow" />
          </Table.Th>
          <Table.Th ta="right" title={t.colRedAria} aria-label={t.colRedAria}>
            <CardGlyph color="red" />
          </Table.Th>
          <Table.Th aria-label={t.colStatus} />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((c, i) => (
          <Table.Tr key={`${c.playerName}-${c.fifaCode ?? ''}-${i}`}>
            <Table.Td>{ranks[i]}</Table.Td>
            <Table.Td>{c.playerName}</Table.Td>
            <Table.Td>
              <TeamCell team={c} locale={locale} />
            </Table.Td>
            <Table.Td ta="right">{c.yellow}</Table.Td>
            <Table.Td ta="right" fw={c.red > 0 ? 700 : 400}>
              {c.red}
            </Table.Td>
            <Table.Td>
              <SuspensionCell suspension={c.suspension} locale={locale} t={t} />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>{t.title}</Title>
          <Text c="dimmed">{t.description}</Text>
        </Stack>

        {isEmpty ? (
          <div className="wc-ranking-empty" role="status">
            <Text c="dimmed">{t.empty}</Text>
          </div>
        ) : (
          <Stack gap="xl">
            {/* 得点ランキング */}
            <section aria-labelledby="ranking-scorers">
              <Title id="ranking-scorers" order={2} size="h4" mb="xs">
                {t.scorersTitle}
              </Title>
              <RankingPreviewMeta
                shown={previewScorers.length}
                total={scorers.length}
                label={t.previewMeta}
              />
              {scorers.length === 0 ? (
                <Text c="dimmed" size="sm">
                  {t.empty}
                </Text>
              ) : (
                <>
                  {renderScorerTable(previewScorers, scorerRanks)}
                  {scorers.length > PREVIEW_LIMIT ? (
                    <div className="wc-ranking-show-all">
                      <Button
                        variant="light"
                        radius="xl"
                        onClick={() => setDrawer('scorers')}
                        aria-haspopup="dialog"
                      >
                        {t.showAllScorers.replace('{total}', String(scorers.length))}
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </section>

            {/* 国別得点数ランキング（テーブル形式・上位CHART_PREVIEW件＋ドロワー）。 */}
            {countryGoals.length > 0 ? (
              <section aria-labelledby="ranking-country-goals">
                <Title id="ranking-country-goals" order={2} size="h4" mb="xs">
                  {t.chartGoalsByCountry}
                </Title>
                {renderCountryGoalTable(previewCountryGoals, countryGoalRanks)}
                {countryGoals.length > CHART_PREVIEW ? (
                  <div className="wc-ranking-show-all">
                    <Button
                      variant="light"
                      radius="xl"
                      onClick={() => setDrawer('countryGoals')}
                      aria-haspopup="dialog"
                    >
                      {t.showAllCountryGoals.replace('{total}', String(countryGoals.length))}
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* 歴代W杯通算得点ランキング（T-109）。ライブ得点ランキングの直下に置く。
                本体は上位3名のコンパクト表示・全件は右からの引き出しドロワー。 */}
            {historical.length > 0 ? (
              <section aria-labelledby="ranking-historical">
                <Title id="ranking-historical" order={2} size="h4" mb="xs">
                  {t.historicalScorersTitle}
                </Title>
                <Text c="dimmed" size="xs" mb="sm" className="wc-ranking-cards-note">
                  {historicalNoteNode}
                </Text>
                {renderHistoricalTable(previewHistorical, historicalRanks)}
                {historical.length > HISTORICAL_PREVIEW ? (
                  <div className="wc-ranking-show-all">
                    <Button
                      variant="light"
                      radius="xl"
                      onClick={() => setDrawer('historical')}
                      aria-haspopup="dialog"
                      leftSection={<DrawerGlyph />}
                    >
                      {t.showAllHistorical.replace('{total}', String(historical.length))}
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* 早割先行購入カード（自己ゲート：無料期間中＆未購入のみ表示）。
                得点ランキングと警告カードの間に置く（T-107・優勝予想ページと同じ導線）。 */}
            {purchaseSlot}

            {/* カード */}
            <section aria-labelledby="ranking-cards">
              <Title id="ranking-cards" order={2} size="h4" mb={4}>
                {t.cardsTitle}
              </Title>
              {/* フェーズ切り替えタブ（W1/W2/W3）。大会が進むと過去フェーズを振り返れる。 */}
              <CardPhaseTabs
                targetWindow={cardTargetWindow}
                activeWindow={cardActiveWindow}
                t={t}
              />
              {/* カード規律（累積/リセット/退場）の注釈（WC2026 は警告リセットが2回）。 */}
              <Text c="dimmed" size="xs" mb="sm" className="wc-ranking-cards-note">
                {t.cardsNote}
              </Text>
              <RankingPreviewMeta shown={previewCards.length} total={cards.length} label={t.previewMeta} />
              {cards.length === 0 ? (
                <Text c="dimmed" size="sm">
                  {t.empty}
                </Text>
              ) : (
                <>
                  {renderCardTable(previewCards, cardRanks)}
                  {cards.length > PREVIEW_LIMIT ? (
                    <div className="wc-ranking-show-all">
                      <Button
                        variant="light"
                        radius="xl"
                        onClick={() => setDrawer('cards')}
                        aria-haspopup="dialog"
                      >
                        {t.showAllCards.replace('{total}', String(cards.length))}
                      </Button>
                    </div>
                  ) : null}
                  {/* 国別カード累積グラフ（T-118 再設計）。上位CHART_PREVIEW件のみインライン・全件はドロワー。 */}
                  {countryCards.length > 0 ? (
                    <>
                      <CountryCardChart data={countryCards.slice(0, CHART_PREVIEW)} t={t} title={t.chartCardsByCountry} locale={locale} />
                      {countryCards.length > CHART_PREVIEW ? (
                        <div className="wc-ranking-show-all">
                          <Button variant="light" radius="xl" onClick={() => setDrawer('countryCards')} aria-haspopup="dialog">
                            {t.showAllCountryCards.replace('{total}', String(countryCards.length))}
                          </Button>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </>
              )}
            </section>
          </Stack>
        )}
      </Stack>
      <Drawer
        opened={drawer === 'scorers'}
        onClose={() => setDrawer(null)}
        position="right"
        size="xl"
        zIndex={1000}
        title={t.allScorersTitle}
        className="wc-ranking-drawer"
      >
        <Stack gap="sm">
          <Text c="dimmed" size="sm">
            {t.allRowsMeta.replace('{total}', String(scorers.length))}
          </Text>
          <div className="wc-ranking-drawer-table">{renderScorerTable(scorers, scorerRanks)}</div>
        </Stack>
      </Drawer>
      <Drawer
        opened={drawer === 'cards'}
        onClose={() => setDrawer(null)}
        position="right"
        size="xl"
        zIndex={1000}
        title={t.allCardsTitle}
        className="wc-ranking-drawer"
      >
        <Stack gap="sm">
          <Text c="dimmed" size="sm">
            {t.allRowsMeta.replace('{total}', String(cards.length))}
          </Text>
          <div className="wc-ranking-drawer-table">{renderCardTable(cards, cardRanks)}</div>
        </Stack>
      </Drawer>
      <Drawer
        opened={drawer === 'historical'}
        onClose={() => setDrawer(null)}
        position="right"
        size="xl"
        zIndex={1000}
        title={t.allHistoricalScorersTitle.replace('{total}', String(historical.length))}
        className="wc-ranking-drawer"
      >
        <Stack gap="sm">
          <Text c="dimmed" size="sm">
            {historicalNoteNode}
          </Text>
          <div className="wc-ranking-drawer-table">
            {renderHistoricalTable(historical, historicalRanks)}
          </div>
        </Stack>
      </Drawer>
      <Drawer
        opened={drawer === 'countryGoals'}
        onClose={() => setDrawer(null)}
        position="right"
        size="xl"
        zIndex={1000}
        title={t.chartGoalsByCountry}
        className="wc-ranking-drawer"
      >
        <div className="wc-ranking-drawer-table">
          {renderCountryGoalTable(countryGoals, countryGoalRanks)}
        </div>
      </Drawer>
      <Drawer
        opened={drawer === 'countryCards'}
        onClose={() => setDrawer(null)}
        position="right"
        size="xl"
        zIndex={1000}
        title={t.chartCardsByCountry}
        className="wc-ranking-drawer"
      >
        <CountryCardChart data={countryCards} t={t} title="" locale={locale} />
      </Drawer>
    </Container>
  );
}
