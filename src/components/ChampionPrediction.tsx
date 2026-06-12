'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Text } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { useI18n } from '@/lib/i18n/context';
import { localizedTeamName } from '@/lib/i18n/team-name';
import {
  combineFactors,
  FACTOR_KEYS,
  type FactorKey,
  type FactorScores,
  type FactorToggles,
} from '@/lib/champion-prediction';

/** 表示に必要な最小限のチーム情報。 */
type TeamMeta = {
  id: string;
  nameJa: string;
  nameEn: string;
  fifaCode: string;
};

/** Map は RSC 境界を越えられないため、サーバからはプレーンオブジェクトで受け取る。 */
type SerializedFactors = Record<FactorKey, Record<string, number>>;

type ChampionPredictionProps = {
  teams: TeamMeta[];
  factors: SerializedFactors;
  /** 敗退が確定したチームの teamId。グレー化・リンク無効化（選べない）にする。 */
  eliminatedIds?: string[];
};

const STORAGE_KEY = 'wc-champion-toggles';

const DEFAULT_TOGGLES: FactorToggles = {
  pastWorldCup: true,
  fifaRank: true,
  wc2026: true,
  crowd: true,
};

const INITIAL_VISIBLE = 10;

function toFactorScores(serialized: SerializedFactors): FactorScores {
  return {
    pastWorldCup: new Map(Object.entries(serialized.pastWorldCup)),
    fifaRank: new Map(Object.entries(serialized.fifaRank)),
    wc2026: new Map(Object.entries(serialized.wc2026)),
    crowd: new Map(Object.entries(serialized.crowd)),
  };
}

function isFactorToggles(value: unknown): value is FactorToggles {
  if (!value || typeof value !== 'object') return false;
  return FACTOR_KEYS.every((k) => typeof (value as Record<string, unknown>)[k] === 'boolean');
}

function formatPercent(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

export function ChampionPrediction({
  teams,
  factors,
  eliminatedIds = [],
}: ChampionPredictionProps) {
  const { locale, dict } = useI18n();
  const eliminated = useMemo(() => new Set(eliminatedIds), [eliminatedIds]);
  const factorLabels: Record<FactorKey, string> = {
    pastWorldCup: dict.prediction.factorPastWorldCup,
    fifaRank: dict.prediction.factorFifaRank,
    wc2026: dict.prediction.factorWc2026,
    crowd: dict.prediction.factorCrowd,
  };
  const [toggles, setToggles] = useState<FactorToggles>(DEFAULT_TOGGLES);
  const [showAll, setShowAll] = useState(false);

  // localStorage はマウント後に読む（SSR とのハイドレーション不一致を避ける）。
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (isFactorToggles(parsed)) setToggles(parsed);
    } catch {
      // 壊れた値は無視してデフォルト（全ON）のまま。
    }
  }, []);

  function toggle(key: FactorKey) {
    setToggles((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 保存失敗（プライベートモード等）は致命的でないので無視。
      }
      return next;
    });
  }

  const teamMeta = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const factorScores = useMemo(() => toFactorScores(factors), [factors]);
  const ranked = useMemo(
    () => combineFactors(factorScores, toggles),
    [factorScores, toggles],
  );

  const visible = showAll ? ranked : ranked.slice(0, INITIAL_VISIBLE);
  const activeCount = FACTOR_KEYS.filter((k) => toggles[k]).length;
  const noneActive = activeCount === 0;
  const onlyWc2026 = activeCount === 1 && toggles.wc2026;

  // 全チームがほぼ均等（＝選んだ指標にまだデータが無い）なら、予想として無意味なので隠す。
  const probs = ranked.map((r) => r.probability);
  const isFlat =
    probs.length > 1 && Math.max(...probs) - Math.min(...probs) < 1e-6;
  const hideList = noneActive || isFlat;

  return (
    <section className="wc-prediction" aria-label={dict.prediction.sectionAria}>
      <div
        className="wc-prediction-toggles"
        role="group"
        aria-label={dict.prediction.togglesAria}
      >
        {FACTOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={toggles[key]}
            className={toggles[key] ? 'is-active' : ''}
            onClick={() => toggle(key)}
          >
            {factorLabels[key]}
          </button>
        ))}
      </div>

      {noneActive ? (
        <Text c="dimmed" size="sm" mt="md">
          {dict.prediction.noneActive}
        </Text>
      ) : isFlat ? (
        <Text c="dimmed" size="sm" mt="md">
          {dict.prediction.flat}
        </Text>
      ) : onlyWc2026 ? (
        <Text c="dimmed" size="sm" mt="md">
          {dict.prediction.onlyWc2026}
        </Text>
      ) : null}

      {hideList ? null : (
      <>
      <ol className="wc-prediction-list">
        {visible.map((row, index) => {
          const team = teamMeta.get(row.teamId);
          const rank = index + 1;
          const isEliminated = eliminated.has(row.teamId);
          // 敗退チームはリンク無効化（選べない）。
          const teamUrl = team && !isEliminated ? `/teams/${team.fifaCode.toLowerCase()}` : null;
          const inner = (
            <>
              <span className="wc-prediction-rank">{rank}</span>
              <span className="wc-prediction-team">
                {team ? (
                  <CountryFlag
                    fifaCode={team.fifaCode}
                    size="sm"
                    ariaLabel={team.nameJa}
                  />
                ) : null}
                <span className="wc-prediction-code">
                  {team?.fifaCode ?? row.teamId.toUpperCase()}
                </span>
                <Text component="span" size="xs" c="dimmed">
                  {localizedTeamName(team, locale)}
                </Text>
              </span>
              <span className="wc-prediction-prob">{formatPercent(row.probability)}</span>
            </>
          );
          const rowClass = `wc-prediction-row${rank <= 3 ? ' is-top' : ''}${
            isEliminated ? ' is-eliminated' : ''
          }`;
          return (
            <li key={row.teamId} className="wc-prediction-item">
              {teamUrl ? (
                <Link
                  href={teamUrl}
                  className={`${rowClass} wc-prediction-row-link`}
                  aria-label={dict.prediction.teamSquadAria.replace(
                    '{name}',
                    localizedTeamName(team, locale),
                  )}
                >
                  {inner}
                </Link>
              ) : (
                <span
                  className={rowClass}
                  aria-label={
                    isEliminated
                      ? dict.prediction.eliminatedAria.replace(
                          '{name}',
                          localizedTeamName(team, locale),
                        )
                      : undefined
                  }
                >
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {ranked.length > INITIAL_VISIBLE ? (
        <button
          type="button"
          className="wc-prediction-more"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll
            ? dict.prediction.showTop
            : dict.prediction.showAll.replace('{count}', String(ranked.length))}
        </button>
      ) : null}
      </>
      )}
    </section>
  );
}
