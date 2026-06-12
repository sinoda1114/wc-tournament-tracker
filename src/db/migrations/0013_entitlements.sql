-- 0013_entitlements.sql
-- 買い切り課金（T-14 / Stripe one-time payment）の entitlement 記録。
--   user_id            Clerk のユーザーID（不透明な一意文字列）。1ユーザー1行。
--   status             'active' = 購入済み（恒久解放）。それ以外は未購入扱い。
--   trial_started_at   遅参救済（72h 無料）の起点（任意・現状は Clerk created_at を使うため未使用）。
--   purchased_at       購入確定（webhook checkout.session.completed）の時刻。
--   stripe_customer_id Stripe の顧客ID（再購入・照合用）。
--   stripe_session_id  Checkout セッションID（冪等性の補助・照合用）。
--   updated_at         最終更新時刻。
-- entitlement 判定は src/lib/billing/entitlement.ts の純関数が status と Clerk created_at から行う。
CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'none',
  trial_started_at TEXT,
  purchased_at TEXT,
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Webhook の冪等性: 処理済み Stripe イベントIDを記録し、二重適用を防ぐ。
--   event_id     Stripe の event.id（一意）。再送されても1回だけ処理する。
--   processed_at 処理時刻。
CREATE TABLE IF NOT EXISTS stripe_processed_events (
  event_id TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
