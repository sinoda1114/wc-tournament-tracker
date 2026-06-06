import { beforeEach, describe, expect, it, vi } from 'vitest';

// run.ts は @/db/queries の I/O 関数に依存するため、純ユニットとして DB をモックする。
// （突き合わせロジック自体は reconcile.test.ts で検証済み。ここでは集約・部分失敗を見る。）
const listTournamentMatches = vi.fn();
const listAllTeams = vi.fn();
const updateMatchResult = vi.fn();

vi.mock('@/db/queries', () => ({
  listTournamentMatches: () => listTournamentMatches(),
  listAllTeams: () => listAllTeams(),
  updateMatchResult: (input: unknown) => updateMatchResult(input),
}));

import type { ResultProvider } from '@/lib/ingest/types';
import { runIngestion } from '@/lib/ingest/run';

/** mex vs rsa が「我々の試合 id=1（両チーム確定・未確定スコア）」に突き合う最小データ。 */
const TEAMS = [
  { id: 'mex', nameJa: 'メキシコ', nameEn: 'Mexico', fifaCode: 'MEX', flag: '🇲🇽', groupName: 'Group A' },
  { id: 'rsa', nameJa: '南アフリカ', nameEn: 'South Africa', fifaCode: 'RSA', flag: '🇿🇦', groupName: 'Group A' },
  { id: 'bra', nameJa: 'ブラジル', nameEn: 'Brazil', fifaCode: 'BRA', flag: '🇧🇷', groupName: 'Group B' },
  { id: 'mar', nameJa: 'モロッコ', nameEn: 'Morocco', fifaCode: 'MAR', flag: '🇲🇦', groupName: 'Group B' },
];

function matchRow(id: number, home: string, away: string) {
  return {
    id,
    stage: 'group_stage',
    matchDate: '2026-06-11',
    kickoffAt: null,
    venueId: 'v1',
    homeSlot: 'A1',
    awaySlot: 'A2',
    homeTeamId: home,
    awayTeamId: away,
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    status: 'scheduled' as const,
    groupLetter: 'A',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function provider(results: unknown[]): ResultProvider {
  return { fetchResults: async () => results as never };
}

beforeEach(() => {
  listTournamentMatches.mockReset();
  listAllTeams.mockReset();
  updateMatchResult.mockReset();
});

describe('runIngestion', () => {
  it('突き合った終了試合を反映し、summary を集約する', async () => {
    listTournamentMatches.mockResolvedValue([
      matchRow(1, 'mex', 'rsa'),
      matchRow(2, 'bra', 'mar'),
    ]);
    listAllTeams.mockResolvedValue(TEAMS);
    updateMatchResult.mockResolvedValue(undefined);

    const summary = await runIngestion(
      provider([
        { dateEvent: '2026-06-11', homeName: 'Mexico', awayName: 'South Africa', homeScore: 2, awayScore: 1, finished: true },
        // bra-mar は未終了 → 対象外
        { dateEvent: '2026-06-11', homeName: 'Brazil', awayName: 'Morocco', homeScore: null, awayScore: null, finished: false },
      ]),
    );

    expect(summary.fetched).toBe(2);
    expect(summary.planned).toBe(1);
    expect(summary.updated).toBe(1);
    expect(summary.matchIds).toEqual([1]);
    expect(summary.failures).toEqual([]);
    expect(updateMatchResult).toHaveBeenCalledTimes(1);
    expect(updateMatchResult).toHaveBeenCalledWith(
      expect.objectContaining({ matchId: 1, homeScore: 2, awayScore: 1, status: 'finished' }),
    );
  });

  it('冪等: 既に同じ結果が入っている試合は更新対象にならない', async () => {
    const finished = { ...matchRow(1, 'mex', 'rsa'), homeScore: 2, awayScore: 1, status: 'finished' as const };
    listTournamentMatches.mockResolvedValue([finished]);
    listAllTeams.mockResolvedValue(TEAMS);
    updateMatchResult.mockResolvedValue(undefined);

    const summary = await runIngestion(
      provider([
        { dateEvent: '2026-06-11', homeName: 'Mexico', awayName: 'South Africa', homeScore: 2, awayScore: 1, finished: true },
      ]),
    );

    expect(summary.planned).toBe(0);
    expect(summary.updated).toBe(0);
    expect(updateMatchResult).not.toHaveBeenCalled();
  });

  it('部分失敗: 1 件が throw しても残りは継続し、failures に集約する', async () => {
    listTournamentMatches.mockResolvedValue([
      matchRow(1, 'mex', 'rsa'),
      matchRow(2, 'bra', 'mar'),
    ]);
    listAllTeams.mockResolvedValue(TEAMS);
    // id=1 の反映だけ失敗させる。
    updateMatchResult.mockImplementation(async (input: { matchId: number }) => {
      if (input.matchId === 1) throw new Error('boom');
    });

    const summary = await runIngestion(
      provider([
        { dateEvent: '2026-06-11', homeName: 'Mexico', awayName: 'South Africa', homeScore: 2, awayScore: 1, finished: true },
        { dateEvent: '2026-06-11', homeName: 'Brazil', awayName: 'Morocco', homeScore: 0, awayScore: 3, finished: true },
      ]),
    );

    expect(summary.planned).toBe(2);
    expect(summary.updated).toBe(1);
    expect(summary.matchIds).toEqual([2]);
    expect(summary.failures).toEqual([{ matchId: 1, message: 'boom' }]);
    // 失敗があっても全 update が試行される（途中で止まらない）。
    expect(updateMatchResult).toHaveBeenCalledTimes(2);
  });

  it('fetchResults のネットワーク失敗は呼び出し側に投げる（cron 再試行に委ねる）', async () => {
    listTournamentMatches.mockResolvedValue([]);
    listAllTeams.mockResolvedValue(TEAMS);
    const failing: ResultProvider = {
      fetchResults: async () => {
        throw new Error('network down');
      },
    };
    await expect(runIngestion(failing)).rejects.toThrow('network down');
    expect(updateMatchResult).not.toHaveBeenCalled();
  });
});
