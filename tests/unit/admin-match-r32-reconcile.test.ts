import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 多層ゲート Phase 1（ゲート1の独立化）を固めるユニット。
 *
 * 要件: 管理者の試合結果手入力（updateAdminMatchAction）が成功したら、
 * ingest 経路と同じく「順位クリンチ → R32 入口解決（resolveAndPersistRoundOf32）」を
 * 必ず走らせる。これにより、どの書込経路（ingest / 手入力）でも決勝T表が即反映される。
 *
 * 安全要件:
 *  - 非admin / 入力不正のときは updateMatchResult も R32 解決も呼ばれない。
 *  - admin かつ正当入力のときだけ、updateMatchResult の後に R32 解決が呼ばれる。
 *  - R32 解決が throw してもスコア保存自体は成功（ok:true）を維持する（best-effort）。
 */

vi.mock('@/lib/auth', () => ({
  isAdmin: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/db/queries', () => ({
  updateMatchResult: vi.fn(async () => undefined),
}));

vi.mock('@/db/queries/round-of-32', () => ({
  resolveAndPersistRoundOf32: vi.fn(async () => ({ updated: 0 })),
}));

import { isAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { updateMatchResult } from '@/db/queries';
import { resolveAndPersistRoundOf32 } from '@/db/queries/round-of-32';
import { updateAdminMatchAction } from '@/app/admin/actions';

const isAdminMock = vi.mocked(isAdmin);
const revalidatePathMock = vi.mocked(revalidatePath);
const updateMatchResultMock = vi.mocked(updateMatchResult);
const resolveR32Mock = vi.mocked(resolveAndPersistRoundOf32);

/** matchUpdateSchema を通る最小の正当入力。 */
const validInput = {
  matchId: 1,
  homeScore: 2,
  awayScore: 0,
  winnerTeamId: null,
  status: 'finished' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('updateAdminMatchAction → R32 入口解決の結線（ゲート1独立化）', () => {
  it('非admin は拒否され、保存も R32 解決も呼ばれない', async () => {
    isAdminMock.mockResolvedValue(false);

    const res = await updateAdminMatchAction(validInput);

    expect(res.ok).toBe(false);
    expect(updateMatchResultMock).not.toHaveBeenCalled();
    expect(resolveR32Mock).not.toHaveBeenCalled();
  });

  it('入力不正は拒否され、保存も R32 解決も呼ばれない', async () => {
    isAdminMock.mockResolvedValue(true);

    const res = await updateAdminMatchAction({
      ...validInput,
      status: 'not_a_status',
    } as unknown as typeof validInput);

    expect(res.ok).toBe(false);
    expect(updateMatchResultMock).not.toHaveBeenCalled();
    expect(resolveR32Mock).not.toHaveBeenCalled();
  });

  it('admin かつ正当入力なら、保存の後に R32 解決が必ず呼ばれる', async () => {
    isAdminMock.mockResolvedValue(true);

    const res = await updateAdminMatchAction(validInput);

    expect(res.ok).toBe(true);
    expect(updateMatchResultMock).toHaveBeenCalledOnce();
    expect(resolveR32Mock).toHaveBeenCalledOnce();
    // 順序: 保存 → R32 解決（順位確定を結果反映の後に評価する）。
    const saveOrder = updateMatchResultMock.mock.invocationCallOrder[0];
    const r32Order = resolveR32Mock.mock.invocationCallOrder[0];
    expect(saveOrder).toBeLessThan(r32Order);
    // R32 反映を即見せるため、決勝T表(/)とグループ表(/groups)を再検証する。
    expect(revalidatePathMock).toHaveBeenCalledWith('/');
    expect(revalidatePathMock).toHaveBeenCalledWith('/groups');
  });

  it('R32 解決が失敗してもスコア保存は成功扱い（best-effort）', async () => {
    isAdminMock.mockResolvedValue(true);
    resolveR32Mock.mockRejectedValueOnce(new Error('boom'));
    // best-effort の catch で出る console.error を抑止（CI ログ汚染防止）。
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await updateAdminMatchAction(validInput);

    expect(res.ok).toBe(true);
    expect(updateMatchResultMock).toHaveBeenCalledOnce();
    expect(resolveR32Mock).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});
