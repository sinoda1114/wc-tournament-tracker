'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Text } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
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
  fifaCode: string;
};

/** Map は RSC 境界を越えられないため、サーバからはプレーンオブジェクトで受け取る。 */
type SerializedFactors = Record<FactorKey, Record<string, number>>;

type ChampionPredictionProps = {
  teams: TeamMeta[];
  factors: SerializedFactors;
};

const STORAGE_KEY = 'wc-champion-toggles';

const FACTOR_LABELS: Record<FactorKey, string> = {
  pastWorldCup: '過去W杯成績',
  fifaRank: 'FIFAランク',
  wc2026: 'WC2026成績',
  crowd: 'みんなの予想',
};

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

export function ChampionPrediction({ teams, factors }: ChampionPredictionProps) {
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
    <section className="wc-prediction" aria-label="優勝国予想">
      <div
        className="wc-prediction-toggles"
        role="group"
        aria-label="予想に使う指標の切替"
      >
        {FACTOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={toggles[key]}
            className={toggles[key] ? 'is-active' : ''}
            onClick={() => toggle(key)}
          >
            {FACTOR_LABELS[key]}
          </button>
        ))}
      </div>

      {noneActive ? (
        <Text c="dimmed" size="sm" mt="md">
          指標を1つ以上選んでください。すべてOFFだと全チームが同じ確率になり、予想になりません。
        </Text>
      ) : isFlat ? (
        <Text c="dimmed" size="sm" mt="md">
          選んだ指標にはまだデータがありません。全チームが横並びになり予想にならないため、データが入るまで表示しません（試合が進むと参考値として表示されます）。
        </Text>
      ) : onlyWc2026 ? (
        <Text c="dimmed" size="sm" mt="md">
          WC2026成績のみで算出しています。大会序盤は消化試合が少なく、わずかな結果に数字が大きく振られて偏りが出ます。試合が進むほど精度が上がるため、現時点ではおおまかな傾向としてご覧ください。
        </Text>
      ) : null}

      {hideList ? null : (
      <>
      <ol className="wc-prediction-list">
        {visible.map((row, index) => {
          const team = teamMeta.get(row.teamId);
          const rank = index + 1;
          const teamUrl = team ? `/teams/${team.fifaCode.toLowerCase()}` : null;
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
                  {team?.nameJa ?? ''}
                </Text>
              </span>
              <span className="wc-prediction-prob">{formatPercent(row.probability)}</span>
            </>
          );
          const rowClass = `wc-prediction-row${rank <= 3 ? ' is-top' : ''}`;
          return (
            <li key={row.teamId} className="wc-prediction-item">
              {teamUrl ? (
                <Link
                  href={teamUrl}
                  className={`${rowClass} wc-prediction-row-link`}
                  aria-label={`${team!.nameJa}の選手を見る`}
                >
                  {inner}
                </Link>
              ) : (
                <span className={rowClass}>{inner}</span>
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
          {showAll ? '上位だけ表示' : `全${ranked.length}チームを表示`}
        </button>
      ) : null}
      </>
      )}
    </section>
  );
}
