import { beforeEach, describe, expect, it, vi } from 'vitest';

// run.ts は @/db/queries の I/O 関数に依存するため、純ユニットとして DB をモックする。
// （突き合わせロジック自体は reconcile.test.ts で検証済み。ここでは集約・部分失敗を見る。）
const listTournamentMatches = vi.fn();
const listAllTeams = vi.fn();
const updateMatchResult = vi.fn();
const resolveAndPersistRoundOf32 = vi.fn();

vi.mock('@/db/queries', () => ({
  listTournamentMatches: () => listTournamentMatches(),
  listAllTeams: () => listAllTeams(),
  updateMatchResult: (input: unknown) => updateMatchResult(input),
}));

// R32 結線（グループ順位→入口）は別モジュール。ここでは ingest の集約・部分失敗の検証に
// 集中し、結線自体はモックする（結線の実挙動は round-of-32 専用テストで担保）。
vi.mock('@/db/queries/round-of-32', () => ({
  resolveAndPersistRoundOf32: () => resolveAndPersistRoundOf32(),
}));

// イベント置き換え（auto のみ delete→insert）は DB 層。ここでは呼び出し内容を検証する。
const replaceAutoMatchEvents = vi.fn();
vi.mock('@/db/match-events', () => ({
  replaceAutoMatchEvents: (matchId: number, events: unknown[]) =>
    replaceAutoMatchEvents(matchId, events),
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
  resolveAndPersistRoundOf32.mockReset();
  resolveAndPersistRoundOf32.mockResolvedValue({ updated: 0 });
  replaceAutoMatchEvents.mockReset();
  replaceAutoMatchEvents.mockResolvedValue(undefined);
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

  it('fetchMatchEvents を持つ provider はイベントタイムラインも同期する', async () => {
    listTournamentMatches.mockResolvedValue([matchRow(1, 'mex', 'rsa')]);
    listAllTeams.mockResolvedValue(TEAMS);
    updateMatchResult.mockResolvedValue(undefined);

    const fetchMatchEvents = vi.fn(async () => [
      { type: 'goal' as const, minute: 23, isHome: true, playerName: 'A', playerOut: null, externalId: 't1' },
      { type: 'yellow_card' as const, minute: 51, isHome: false, playerName: 'B', playerOut: null, externalId: 't2' },
    ]);
    const summary = await runIngestion({
      fetchResults: async () =>
        [{ dateEvent: '2026-06-11', homeName: 'Mexico', awayName: 'South Africa', homeScore: 2, awayScore: 1, finished: true, externalEventId: '100' }] as never,
      fetchMatchEvents,
    });

    expect(fetchMatchEvents).toHaveBeenCalledWith('100');
    expect(replaceAutoMatchEvents).toHaveBeenCalledTimes(1);
    expect(replaceAutoMatchEvents).toHaveBeenCalledWith(1, [
      expect.objectContaining({ type: 'goal', teamId: 'mex', playerName: 'A', sortOrder: 0, externalId: 't1' }),
      expect.objectContaining({ type: 'yellow_card', teamId: 'rsa', playerName: 'B', sortOrder: 1, externalId: 't2' }),
    ]);
    expect(summary.events).toEqual({
      planned: 1,
      synced: 1,
      inserted: 2,
      empty: 0,
      perMatch: [{ matchId: 1, count: 2 }],
      failures: [],
    });
  });

  it('タイムラインが空の試合は既存 auto を消さずスキップし、empty として可視化する', async () => {
    listTournamentMatches.mockResolvedValue([matchRow(1, 'mex', 'rsa')]);
    listAllTeams.mockResolvedValue(TEAMS);
    updateMatchResult.mockResolvedValue(undefined);

    const summary = await runIngestion({
      fetchResults: async () =>
        [{ dateEvent: '2026-06-11', homeName: 'Mexico', awayName: 'South Africa', homeScore: 2, awayScore: 1, finished: true, externalEventId: '100' }] as never,
      fetchMatchEvents: async () => [],
    });

    expect(replaceAutoMatchEvents).not.toHaveBeenCalled();
    expect(summary.events).toMatchObject({
      planned: 1,
      synced: 0,
      inserted: 0,
      empty: 1,
      perMatch: [{ matchId: 1, count: 0 }],
    });
  });

  it('イベント同期の失敗はスコア反映の成功を覆さず events.failures に集約する', async () => {
    listTournamentMatches.mockResolvedValue([matchRow(1, 'mex', 'rsa')]);
    listAllTeams.mockResolvedValue(TEAMS);
    updateMatchResult.mockResolvedValue(undefined);

    const summary = await runIngestion({
      fetchResults: async () =>
        [{ dateEvent: '2026-06-11', homeName: 'Mexico', awayName: 'South Africa', homeScore: 2, awayScore: 1, finished: true, externalEventId: '100' }] as never,
      fetchMatchEvents: async () => {
        throw new Error('timeline down');
      },
    });

    expect(summary.updated).toBe(1);
    expect(summary.events.failures).toEqual([{ matchId: 1, message: 'timeline down' }]);
    expect(replaceAutoMatchEvents).not.toHaveBeenCalled();
  });

  it('fetchMatchEvents を持たない provider はイベント同期をスキップする（後方互換）', async () => {
    listTournamentMatches.mockResolvedValue([matchRow(1, 'mex', 'rsa')]);
    listAllTeams.mockResolvedValue(TEAMS);
    updateMatchResult.mockResolvedValue(undefined);

    const summary = await runIngestion(
      provider([
        { dateEvent: '2026-06-11', homeName: 'Mexico', awayName: 'South Africa', homeScore: 2, awayScore: 1, finished: true, externalEventId: '100' },
      ]),
    );

    expect(replaceAutoMatchEvents).not.toHaveBeenCalled();
    expect(summary.events).toEqual({
      planned: 0,
      synced: 0,
      inserted: 0,
      empty: 0,
      perMatch: [],
      failures: [],
    });
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
