-- データヘルス通知（T-93）の重複抑止状態。
-- 1通知先につき現在アクティブな所見シグネチャを保持し、同じ異常の連投を防ぐ。
CREATE TABLE IF NOT EXISTS health_notification_state (
  channel TEXT PRIMARY KEY,
  active_signature TEXT,
  last_status TEXT NOT NULL DEFAULT 'ok',
  last_notified_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

