import type { MatchDetail } from '@/db/queries';

import { BracketMiniCard } from './BracketMiniCard';

type BracketLayoutProps = {
  matches: MatchDetail[];
};

const LEFT_PAIRS = {
  r32: [
    [74, 77],
    [73, 75],
    [83, 84],
    [81, 82],
  ],
  r16: [
    [89, 90],
    [93, 94],
  ],
  qf: [[97, 98]],
} as const;

const LEFT_SF_ID = 101;

const RIGHT_PAIRS = {
  r32: [
    [76, 78],
    [79, 80],
    [86, 88],
    [85, 87],
  ],
  r16: [
    [91, 92],
    [95, 96],
  ],
  qf: [[99, 100]],
} as const;

const RIGHT_SF_ID = 102;

const FINAL_ID = 104;
const THIRD_PLACE_ID = 103;

export function BracketLayout({ matches }: BracketLayoutProps) {
  const byId = new Map(matches.map((match) => [match.id, match]));
  const get = (id: number) => byId.get(id) ?? null;

  const renderPairCol = (
    pairs: readonly (readonly [number, number])[],
    side: 'left' | 'right',
    stage: 'r32' | 'r16' | 'qf',
  ) => (
    <div className={`wc-bracket-col wc-side-${side} wc-stage-${stage}`}>
      {pairs.map(([a, b]) => (
        <div key={`${a}-${b}`} className="wc-pair">
          {get(a) ? <BracketMiniCard match={get(a)!} /> : null}
          {get(b) ? <BracketMiniCard match={get(b)!} /> : null}
        </div>
      ))}
    </div>
  );

  const renderSfCol = (id: number, side: 'left' | 'right') => {
    const match = get(id);
    return (
      <div className={`wc-bracket-col wc-side-${side} wc-stage-sf`}>
        <div className="wc-pair wc-pair-solo">
          {match ? <BracketMiniCard match={match} /> : null}
        </div>
      </div>
    );
  };

  const finalMatch = get(FINAL_ID);
  const thirdMatch = get(THIRD_PLACE_ID);

  return (
    <div className="wc-bracket-scroll-x">
      <div className="wc-bracket">
        {renderPairCol(LEFT_PAIRS.r32, 'left', 'r32')}
        {renderPairCol(LEFT_PAIRS.r16, 'left', 'r16')}
        {renderPairCol(LEFT_PAIRS.qf, 'left', 'qf')}
        {renderSfCol(LEFT_SF_ID, 'left')}

        <div className="wc-bracket-final-cell">
          {finalMatch ? (
            <div className="wc-final-wrap">
              <div className="wc-final-title">🏆 決勝</div>
              <BracketMiniCard match={finalMatch} emphasized />
            </div>
          ) : null}
          {thirdMatch ? (
            <div className="wc-third-place">
              <div className="wc-third-place-title">🥉 3位決定戦</div>
              <BracketMiniCard match={thirdMatch} />
            </div>
          ) : null}
        </div>

        {renderSfCol(RIGHT_SF_ID, 'right')}
        {renderPairCol(RIGHT_PAIRS.qf, 'right', 'qf')}
        {renderPairCol(RIGHT_PAIRS.r16, 'right', 'r16')}
        {renderPairCol(RIGHT_PAIRS.r32, 'right', 'r32')}
      </div>
    </div>
  );
}
