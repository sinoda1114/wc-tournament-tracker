import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * T-48 投票リセットのサーバーアクション施錠を固めるユニット。
 *
 * 安全要件:
 *  - 非admin（匿名・allowlist 外）は拒否され、DELETE が一切呼ばれない。
 *  - ログイン voter_id が取れないときも拒否（DELETE 呼ばれない）。
 *  - admin かつ voter_id があるときだけ、**自分の voter_id** を引数に削除関数が呼ばれる
 *    （他ユーザーを巻き込む全削除系の関数は存在しない＝呼べない）。
 */

vi.mock('@/lib/auth', () => ({
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/voter', () => ({
  requireVoterId: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/db/crowd-admin', async () => {
  const actual =
    await vi.importActual<typeof import('@/db/crowd-admin')>('@/db/crowd-admin');
  return {
    isVotingStage: actual.isVotingStage,
    deleteMyCrowdVotes: vi.fn(async () => 2),
    deleteMyCrowdVoteByStage: vi.fn(async () => 1),
  };
});

import { isAdmin } from '@/lib/auth';
import { requireVoterId } from '@/lib/voter';
import { deleteMyCrowdVoteByStage, deleteMyCrowdVotes } from '@/db/crowd-admin';
import {
  resetMyCrowdVoteByStageAction,
  resetMyCrowdVotesAction,
} from '@/app/admin/actions';

const isAdminMock = vi.mocked(isAdmin);
const requireVoterIdMock = vi.mocked(requireVoterId);
const deleteByStageMock = vi.mocked(deleteMyCrowdVoteByStage);
const deleteMineMock = vi.mocked(deleteMyCrowdVotes);

beforeEach(() => {
  vi.clearAllMocks();
  requireVoterIdMock.mockResolvedValue('user_self');
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('自分のステージ別リセット（resetMyCrowdVoteByStageAction）', () => {
  it('非admin（匿名含む）は拒否され、DELETE は呼ばれない', async () => {
    isAdminMock.mockResolvedValue(false);

    const res = await resetMyCrowdVoteByStageAction('group_stage');

    expect(res.ok).toBe(false);
    expect(deleteByStageMock).not.toHaveBeenCalled();
  });

  it('admin でも不正ステージは拒否され、DELETE は呼ばれない', async () => {
    isAdminMock.mockResolvedValue(true);

    const res = await resetMyCrowdVoteByStageAction('not_a_stage');

    expect(res.ok).toBe(false);
    expect(deleteByStageMock).not.toHaveBeenCalled();
  });

  it('admin でも voter_id が無ければ拒否（DELETE 呼ばれない）', async () => {
    isAdminMock.mockResolvedValue(true);
    requireVoterIdMock.mockResolvedValue(null);

    const res = await resetMyCrowdVoteByStageAction('round_of_32');

    expect(res.ok).toBe(false);
    expect(deleteByStageMock).not.toHaveBeenCalled();
  });

  it('admin かつ voter_id ありのときだけ、自分の voter_id ＋ ステージで削除する', async () => {
    isAdminMock.mockResolvedValue(true);

    const res = await resetMyCrowdVoteByStageAction('round_of_32');

    expect(res.ok).toBe(true);
    expect(deleteByStageMock).toHaveBeenCalledExactlyOnceWith('user_self', 'round_of_32');
  });
});

describe('自分の全投票リセット（resetMyCrowdVotesAction）', () => {
  it('非admin は拒否され、削除は呼ばれない', async () => {
    isAdminMock.mockResolvedValue(false);

    const res = await resetMyCrowdVotesAction();

    expect(res.ok).toBe(false);
    expect(deleteMineMock).not.toHaveBeenCalled();
  });

  it('admin でも voter_id が無ければ拒否', async () => {
    isAdminMock.mockResolvedValue(true);
    requireVoterIdMock.mockResolvedValue(null);

    const res = await resetMyCrowdVotesAction();

    expect(res.ok).toBe(false);
    expect(deleteMineMock).not.toHaveBeenCalled();
  });

  it('admin かつ voter_id ありのときだけ、自分の voter_id で削除する', async () => {
    isAdminMock.mockResolvedValue(true);

    const res = await resetMyCrowdVotesAction();

    expect(res.ok).toBe(true);
    expect(deleteMineMock).toHaveBeenCalledExactlyOnceWith('user_self');
  });
});
