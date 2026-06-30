import { describe, expect, it } from 'vitest';

import type { Match } from '@/db/queries';
import {
  archivedVotingStages,
  eliminatedTeamIds,
  stageOpenForVoting,
  stageVotingState,
  votableStage,
  type VotingStage,
} from '@/lib/crowd';

/** テスト用の Match ファクトリ。必要なフィールドだけ上書きする。 */
function m(partial: Partial<Match> & { stage: string }): Match {
  return {
    id: 1,
    matchDate: '2026-06-11',
    kickoffAt: null,
    venueId: 'v1',
    homeSlot: 'A1',
    awaySlot: 'A2',
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    penaltyHomeScore: null,
    penaltyAwayScore: null,
    winnerTeamId: null,
    status: 'scheduled',
    groupLetter: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

/** finished な試合の共通フィールド。 */
const FIN = {
  status: 'finished' as const,
  homeTeamId: 'a',
  awayTeamId: 'b',
  homeScore: 1,
  awayScore: 0,
  winnerTeamId: 'a',
};

describe('stageVotingState', () => {
  const now = new Date('2026-06-15T00:00:00Z');

  it('対象チームが未確定（両枠 null）なら not_yet_open', () => {
    const matches = [
      m({ stage: 'round_of_16', homeTeamId: null, awayTeamId: null, kickoffAt: '2026-07-01T18:00:00Z' }),
    ];
    expect(stageVotingState(matches, 'round_of_16', now)).toBe('not_yet_open');
  });

  it('チームが揃い次の投票ステージが未開始なら open（自ステージの初戦KO済みでも開く）', () => {
    const matches = [
      // 自ステージ(R16)は初戦KO済みでも、次ステージ(QF)が始まっていなければ開いたまま。
      m({ stage: 'round_of_16', homeTeamId: 'fra', awayTeamId: 'eng', kickoffAt: '2026-06-14T18:00:00Z' }),
      m({ stage: 'round_of_16', homeTeamId: 'bra', awayTeamId: 'arg', kickoffAt: '2026-06-16T18:00:00Z' }),
    ];
    expect(stageVotingState(matches, 'round_of_16', now)).toBe('open');
  });

  it('締切＝次の投票ステージの初戦KOを過ぎたら closed', () => {
    const matches = [
      // R32 のチームは揃っている
      m({ stage: 'round_of_32', homeTeamId: 'fra', awayTeamId: 'eng', kickoffAt: '2026-06-10T18:00:00Z' }),
      // 次ステージ R16 が now より前に開始済み → R32 はロック
      m({ stage: 'round_of_16', homeTeamId: 'bra', awayTeamId: 'arg', kickoffAt: '2026-06-14T18:00:00Z' }),
    ];
    expect(stageVotingState(matches, 'round_of_32', now)).toBe('closed');
  });

  it('全試合 finished なら archived（履歴）', () => {
    const matches = [
      m({ stage: 'group_stage', ...FIN, kickoffAt: '2026-06-11T18:00:00Z' }),
      m({ stage: 'group_stage', ...FIN, kickoffAt: '2026-06-12T18:00:00Z' }),
    ];
    expect(stageVotingState(matches, 'group_stage', now)).toBe('archived');
  });

  it('次ステージ開始済みでも自ステージ未終了なら closed（archived ではない）', () => {
    const matches = [
      m({ stage: 'round_of_32', ...FIN, kickoffAt: '2026-06-10T18:00:00Z' }),
      m({ stage: 'round_of_32', homeTeamId: 'bra', awayTeamId: 'arg', kickoffAt: '2026-06-16T18:00:00Z' }),
      // 次ステージ R16 が開始済み → R32 は closed
      m({ stage: 'round_of_16', homeTeamId: 'ned', awayTeamId: 'usa', kickoffAt: '2026-06-14T18:00:00Z' }),
    ];
    expect(stageVotingState(matches, 'round_of_32', now)).toBe('closed');
  });

  it('そのステージの試合が存在しなければ not_yet_open', () => {
    const matches = [m({ stage: 'group_stage', ...FIN })];
    expect(stageVotingState(matches, 'final', now)).toBe('not_yet_open');
  });

  it('次の投票ステージが無い/未定なら open のまま（締切不能）', () => {
    // final はこれより後の投票ステージが無い → 締切なしで open。
    const matches = [
      m({ stage: 'final', homeTeamId: 'fra', awayTeamId: 'eng', kickoffAt: '2026-06-10T18:00:00Z' }),
    ];
    expect(stageVotingState(matches, 'final', now)).toBe('open');
  });

  it('グループ戦は会期中ずっと open（開幕戦でロックしない・旧仕様の是正）', () => {
    const matches = [
      // 開幕戦は now より前にKO済みだが、次ステージ(R32)はまだ未開始
      m({ stage: 'group_stage', homeTeamId: 'mex', awayTeamId: 'rsa', kickoffAt: '2026-06-11T18:00:00Z' }),
      m({ stage: 'group_stage', homeTeamId: 'jpn', awayTeamId: 'bra', kickoffAt: '2026-06-20T18:00:00Z' }),
      m({ stage: 'round_of_32', homeTeamId: null, awayTeamId: null, kickoffAt: '2026-06-28T18:00:00Z' }),
    ];
    expect(stageVotingState(matches, 'group_stage', now)).toBe('open');
  });
});

describe('stageOpenForVoting', () => {
  const now = new Date('2026-06-15T00:00:00Z');
  it('open のときだけ true', () => {
    // semi_final は次ステージ(final)が未来なら open / 開始済みなら closed。
    const open = [
      m({ stage: 'semi_final', homeTeamId: 'fra', awayTeamId: 'eng', kickoffAt: '2026-07-14T18:00:00Z' }),
      m({ stage: 'final', homeTeamId: null, awayTeamId: null, kickoffAt: '2026-07-19T18:00:00Z' }),
    ];
    const closed = [
      m({ stage: 'semi_final', homeTeamId: 'fra', awayTeamId: 'eng', kickoffAt: '2026-06-10T18:00:00Z' }),
      m({ stage: 'final', homeTeamId: 'bra', awayTeamId: 'arg', kickoffAt: '2026-06-14T18:00:00Z' }),
    ];
    expect(stageOpenForVoting(open, 'semi_final', now)).toBe(true);
    expect(stageOpenForVoting(closed, 'semi_final', now)).toBe(false);
  });
});

describe('votableStage', () => {
  const now = new Date('2026-06-15T00:00:00Z');

  it('open な最初のステージを返す（次ステージ開始済みの前ラウンドは飛ばす）', () => {
    const matches = [
      // group は全終了（archived）
      m({ stage: 'group_stage', ...FIN, kickoffAt: '2026-06-11T18:00:00Z' }),
      // R32 はチーム確定だが次ステージ R16 が開始済み → closed
      m({ stage: 'round_of_32', homeTeamId: 'fra', awayTeamId: 'eng', kickoffAt: '2026-06-10T18:00:00Z' }),
      // R16 はチーム確定・次ステージ(QF)未開始 → open
      m({ stage: 'round_of_16', homeTeamId: 'fra', awayTeamId: 'bra', kickoffAt: '2026-06-14T18:00:00Z' }),
    ];
    expect(votableStage(matches, now)).toBe('round_of_16');
  });

  it('グループ戦会期中はグループ戦を返す（旧仕様では null だった死に体の是正）', () => {
    const matches = [
      m({ stage: 'group_stage', homeTeamId: 'mex', awayTeamId: 'rsa', kickoffAt: '2026-06-11T18:00:00Z' }),
      m({ stage: 'group_stage', homeTeamId: 'jpn', awayTeamId: 'bra', kickoffAt: '2026-06-20T18:00:00Z' }),
      m({ stage: 'round_of_32', homeTeamId: null, awayTeamId: null, kickoffAt: '2026-06-28T18:00:00Z' }),
    ];
    expect(votableStage(matches, now)).toBe('group_stage');
  });

  it('どのステージも open でなければ null', () => {
    const matches = [m({ stage: 'group_stage', ...FIN, kickoffAt: '2026-06-11T18:00:00Z' })];
    expect(votableStage(matches, now)).toBeNull();
  });
});

describe('archivedVotingStages', () => {
  const now = new Date('2026-06-15T00:00:00Z');
  it('archived なステージだけを進行順で返す', () => {
    const matches = [
      m({ stage: 'group_stage', ...FIN, kickoffAt: '2026-06-11T18:00:00Z' }),
      m({ stage: 'round_of_32', homeTeamId: 'fra', awayTeamId: 'eng', kickoffAt: '2026-07-01T18:00:00Z' }),
    ];
    expect(archivedVotingStages(matches, now)).toEqual<VotingStage[]>(['group_stage']);
  });
});

describe('eliminatedTeamIds', () => {
  it('決勝Tで敗退（負け側）したチームを返す', () => {
    const matches = [
      // R32: fra が eng に勝利 → eng 敗退
      m({ stage: 'round_of_32', homeTeamId: 'fra', awayTeamId: 'eng', homeScore: 2, awayScore: 1, winnerTeamId: 'fra', status: 'finished' }),
      // R16: fra が bra に敗北 → fra 敗退
      m({ stage: 'round_of_16', homeTeamId: 'fra', awayTeamId: 'bra', homeScore: 0, awayScore: 1, winnerTeamId: 'bra', status: 'finished' }),
    ];
    const out = eliminatedTeamIds(matches);
    expect(out.has('eng')).toBe(true);
    expect(out.has('fra')).toBe(true);
    expect(out.has('bra')).toBe(false);
  });

  it('未確定（winner null）の試合は誰も敗退扱いにしない', () => {
    const matches = [
      m({ stage: 'round_of_16', homeTeamId: 'fra', awayTeamId: 'bra', status: 'scheduled' }),
    ];
    expect(eliminatedTeamIds(matches).size).toBe(0);
  });

  it('third_place の敗者も敗退扱い', () => {
    const matches = [
      m({ stage: 'third_place', homeTeamId: 'ned', awayTeamId: 'por', homeScore: 0, awayScore: 1, winnerTeamId: 'por', status: 'finished' }),
    ];
    expect(eliminatedTeamIds(matches).has('ned')).toBe(true);
  });

  it('グループ戦の敗者は敗退扱いにしない（1敗では敗退ではない）', () => {
    const matches = [
      // group_stage: mex が rsa に勝利。rsa は1敗だが勝ち抜け可能なので敗退ではない。
      m({ stage: 'group_stage', homeTeamId: 'mex', awayTeamId: 'rsa', homeScore: 2, awayScore: 0, winnerTeamId: 'mex', status: 'finished' }),
    ];
    expect(eliminatedTeamIds(matches).size).toBe(0);
  });

  it('グループ戦とKOが混在しても、敗退扱いはKOの敗者のみ', () => {
    const matches = [
      m({ stage: 'group_stage', homeTeamId: 'mex', awayTeamId: 'rsa', homeScore: 2, awayScore: 0, winnerTeamId: 'mex', status: 'finished' }),
      m({ stage: 'round_of_32', homeTeamId: 'fra', awayTeamId: 'eng', homeScore: 2, awayScore: 1, winnerTeamId: 'fra', status: 'finished' }),
    ];
    const out = eliminatedTeamIds(matches);
    expect(out.has('rsa')).toBe(false); // グループ1敗は敗退ではない
    expect(out.has('eng')).toBe(true); // KO 敗者は敗退
  });
});
