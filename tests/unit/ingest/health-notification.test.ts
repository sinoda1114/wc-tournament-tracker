import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HealthNotificationState } from '@/db/health-notifications';
import {
  auditSignature,
  buildDiscordHealthMessage,
  decideHealthNotification,
  notifyDiscordHealth,
} from '@/lib/ingest/health-notification';
import type { AuditFinding, AuditReport } from '@/lib/ingest/audit';

function finding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    matchId: 14,
    kind: 'lineup_missing',
    severity: 'warn',
    message: '終了済みグループ戦なのに先発XIを取得できません。',
    context: { group: 'H' },
    ...overrides,
  };
}

function report(findings: AuditFinding[] = []): AuditReport {
  return {
    generatedAt: '2026-06-16T02:00:00.000Z',
    checkedMatches: 104,
    findings,
    counts: {
      staleUnfinished: findings.filter((f) => f.kind === 'stale_unfinished').length,
      scoreMismatch: findings.filter((f) => f.kind.startsWith('scorers_')).length,
      finishedNoSubs: findings.filter((f) => f.kind === 'finished_no_subs').length,
      lineupIssues: findings.filter((f) => f.kind.startsWith('lineup_')).length,
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.DISCORD_HEALTH_WEBHOOK_URL;
});

describe('data health Discord notification', () => {
  it('所見の集合から安定したsignatureを作る', () => {
    const a = finding({ matchId: 14, kind: 'lineup_missing' });
    const b = finding({ matchId: 3, kind: 'scorers_incomplete' });

    expect(auditSignature(report([a, b]))).toBe(auditSignature(report([b, a])));
  });

  it('新規異常は通知対象、同じ異常は連投しない', () => {
    const r = report([finding()]);
    const first = decideHealthNotification(r, null);
    expect(first.status).toBe('alert');

    const state: HealthNotificationState = {
      channel: 'discord-health',
      activeSignature: first.status === 'alert' ? first.signature : null,
      lastStatus: 'alert',
    };
    expect(decideHealthNotification(r, state)).toEqual({ status: 'unchanged' });
  });

  it('異常状態から所見0件になったら復旧通知を出す', () => {
    const state: HealthNotificationState = {
      channel: 'discord-health',
      activeSignature: '14:lineup_missing:warn',
      lastStatus: 'alert',
    };

    expect(decideHealthNotification(report(), state)).toEqual({ status: 'recovered' });
  });

  it('Discordメッセージに件数・代表所見・adminリンクを含める', () => {
    const message = buildDiscordHealthMessage(report([finding()]), 'alert');

    expect(message).toContain('@everyone');
    expect(message).toContain('🔴 MatchFav データヘルス異常');
    expect(message).toContain('先発XI: 1');
    expect(message).toContain('#14 lineup_missing');
    expect(message).toContain('https://matchfav.com/admin/health');
  });

  it('代表所見に対象試合の深リンクを含める', () => {
    const message = buildDiscordHealthMessage(report([finding({ matchId: 19 })]), 'alert');

    expect(message).toContain('https://matchfav.com/matches/19');
  });

  it('復旧メッセージには全体メンションを含めない', () => {
    const message = buildDiscordHealthMessage(report(), 'recovered');

    expect(message).not.toContain('@everyone');
    expect(message).toContain('✅ MatchFav データヘルス復旧');
  });

  it('Webhook URL未設定なら何もしない', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(notifyDiscordHealth(report([finding()]))).resolves.toBe('unchanged');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('異常通知を送ったら状態をalertとして保存する', async () => {
    process.env.DISCORD_HEALTH_WEBHOOK_URL = 'https://discord.example/webhook';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));
    const store = {
      get: vi.fn(async () => null),
      markAlert: vi.fn(async () => undefined),
      markRecovered: vi.fn(async () => undefined),
    };

    await expect(notifyDiscordHealth(report([finding()]), { store })).resolves.toBe('alert');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.example/webhook',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"allowed_mentions":{"parse":["everyone"]}'),
      }),
    );
    expect(store.markAlert).toHaveBeenCalledWith(auditSignature(report([finding()])));
    expect(store.markRecovered).not.toHaveBeenCalled();
  });

  it('復旧通知を送ったら状態をokに戻す', async () => {
    process.env.DISCORD_HEALTH_WEBHOOK_URL = 'https://discord.example/webhook';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    const store = {
      get: vi.fn(async () => ({
        channel: 'discord-health',
        activeSignature: '14:lineup_missing:warn',
        lastStatus: 'alert' as const,
      })),
      markAlert: vi.fn(async () => undefined),
      markRecovered: vi.fn(async () => undefined),
    };

    await expect(notifyDiscordHealth(report(), { store })).resolves.toBe('recovered');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://discord.example/webhook',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"allowed_mentions":{"parse":[]}'),
      }),
    );
    expect(store.markRecovered).toHaveBeenCalledOnce();
    expect(store.markAlert).not.toHaveBeenCalled();
  });

  // T-111: ヘルス画面に出る未取込疑い（第19試合型）が、取込とは独立した監視 cron 経由で
  // Discord へ橋渡しされ、alert → 連投なし(unchanged) → 解消で復旧通知、まで一連で回ることを
  // 疑似データで検証する。state は cron 間で永続する想定なので可変ストアで模す。
  it('未取込疑い(第19試合型)を疑似データで alert→連投なし→復旧まで通知する', async () => {
    process.env.DISCORD_HEALTH_WEBHOOK_URL = 'https://discord.example/webhook';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));

    let persisted: HealthNotificationState | null = null;
    const store = {
      get: vi.fn(async () => persisted),
      markAlert: vi.fn(async (signature: string) => {
        persisted = { channel: 'discord-health', activeSignature: signature, lastStatus: 'alert' };
      }),
      markRecovered: vi.fn(async () => {
        persisted = { channel: 'discord-health', activeSignature: null, lastStatus: 'ok' };
      }),
    };

    const stale = finding({
      matchId: 19,
      kind: 'stale_unfinished',
      severity: 'error',
      message: 'KO後 約2.5 時間以上経過しても未終了（status=scheduled）。試合結果が未取込の可能性。',
      context: { status: 'scheduled', group: 'C' },
    });
    const staleReport = report([stale]);

    // 1) 初回検知 → 異常通知（@everyone 付き）。
    await expect(notifyDiscordHealth(staleReport, { store })).resolves.toBe('alert');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://discord.example/webhook',
      expect.objectContaining({
        body: expect.stringContaining('https://matchfav.com/matches/19'),
      }),
    );

    // 2) 次回 cron でも同じ異常なら連投しない。
    await expect(notifyDiscordHealth(staleReport, { store })).resolves.toBe('unchanged');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 3) 取込が追いついて所見0件になったら復旧通知（メンションなし）。
    await expect(notifyDiscordHealth(report(), { store })).resolves.toBe('recovered');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://discord.example/webhook',
      expect.objectContaining({
        body: expect.stringContaining('"allowed_mentions":{"parse":[]}'),
      }),
    );
  });
});
