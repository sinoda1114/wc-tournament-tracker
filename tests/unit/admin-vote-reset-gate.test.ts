import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * T-47 投票リセットのサーバーアクション施錠を固めるユニット。
 *
 * 非admin（匿名・allowlist 外ログイン）では isAdmin() が false になり、
 * リセットアクションが拒否され、かつ DB の DELETE が一切呼ばれないことを担保する。
 * admin のときだけ削除関数が呼ばれることも確認する。
 */

vi.mock('@/lib/auth', () => ({
  isAdmin: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/db/crowd-admin', async () => {
  const actual =
    await vi.importActual<typeof import('@/db/crowd-admin')>('@/db/crowd-admin');
  return {
    // isVotingStage は実物（ステージ検証ロジックを生かす）。
    isVotingStage: actual.isVotingStage,
    deleteCrowdVotesByStage: vi.fn(async () => 3),
    deleteAllCrowdVotes: vi.fn(async () => 5),
  };
});

import { isAdmin } from '@/lib/auth';
import {
  deleteAllCrowdVotes,
  deleteCrowdVotesByStage,
} from '@/db/crowd-admin';
import {
  resetAllCrowdVotesAction,
  resetCrowdVotesByStageAction,
} from '@/app/admin/actions';

const isAdminMock = vi.mocked(isAdmin);
const deleteByStageMock = vi.mocked(deleteCrowdVotesByStage);
const deleteAllMock = vi.mocked(deleteAllCrowdVotes);

describe('投票リセット施錠（resetCrowdVotesByStageAction）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('非admin（匿名含む）は拒否され、DELETE は呼ばれない', async () => {
    isAdminMock.mockResolvedValue(false);

    const res = await resetCrowdVotesByStageAction('group_stage');

    expect(res.ok).toBe(false);
    expect(deleteByStageMock).not.toHaveBeenCalled();
  });

  it('admin でも不正ステージは拒否され、DELETE は呼ばれない', async () => {
    isAdminMock.mockResolvedValue(true);

    const res = await resetCrowdVotesByStageAction('not_a_stage');

    expect(res.ok).toBe(false);
    expect(deleteByStageMock).not.toHaveBeenCalled();
  });

  it('admin かつ正当なステージのときだけ当該ステージを削除する', async () => {
    isAdminMock.mockResolvedValue(true);

    const res = await resetCrowdVotesByStageAction('round_of_32');

    expect(res.ok).toBe(true);
    expect(deleteByStageMock).toHaveBeenCalledExactlyOnceWith('round_of_32');
  });
});

describe('投票リセット施錠（resetAllCrowdVotesAction）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('非admin は拒否され、全削除は呼ばれない', async () => {
    isAdminMock.mockResolvedValue(false);

    const res = await resetAllCrowdVotesAction();

    expect(res.ok).toBe(false);
    expect(deleteAllMock).not.toHaveBeenCalled();
  });

  it('admin のときだけ全削除を実行する', async () => {
    isAdminMock.mockResolvedValue(true);

    const res = await resetAllCrowdVotesAction();

    expect(res.ok).toBe(true);
    expect(deleteAllMock).toHaveBeenCalledOnce();
  });
});
