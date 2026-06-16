import { getDb } from './client';

const db = () => getDb();

export type HealthNotificationState = {
  channel: string;
  activeSignature: string | null;
  lastStatus: 'ok' | 'alert';
};

type HealthNotificationStateRow = {
  channel: string;
  active_signature: string | null;
  last_status: 'ok' | 'alert';
};

export async function getHealthNotificationState(
  channel: string,
): Promise<HealthNotificationState | null> {
  const result = await db().execute({
    sql: `
      SELECT channel, active_signature, last_status
      FROM health_notification_state
      WHERE channel = ?
      LIMIT 1
    `,
    args: [channel],
  });
  const row = result.rows[0] as unknown as HealthNotificationStateRow | undefined;
  if (!row) return null;
  return {
    channel: row.channel,
    activeSignature: row.active_signature,
    lastStatus: row.last_status === 'alert' ? 'alert' : 'ok',
  };
}

export async function markHealthNotificationAlert(
  channel: string,
  signature: string,
): Promise<void> {
  await db().execute({
    sql: `
      INSERT INTO health_notification_state
        (channel, active_signature, last_status, last_notified_at, updated_at)
      VALUES
        (?, ?, 'alert', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(channel) DO UPDATE SET
        active_signature = excluded.active_signature,
        last_status = 'alert',
        last_notified_at = excluded.last_notified_at,
        updated_at = excluded.updated_at
    `,
    args: [channel, signature],
  });
}

export async function markHealthNotificationRecovered(channel: string): Promise<void> {
  await db().execute({
    sql: `
      INSERT INTO health_notification_state
        (channel, active_signature, last_status, last_notified_at, updated_at)
      VALUES
        (?, NULL, 'ok', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(channel) DO UPDATE SET
        active_signature = NULL,
        last_status = 'ok',
        last_notified_at = excluded.last_notified_at,
        updated_at = excluded.updated_at
    `,
    args: [channel],
  });
}

