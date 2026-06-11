-- 0010_user_favorites.sql
-- ログインユーザーのお気に入りチーム（端末間同期）。
--   user_id   Clerk のユーザーID（不透明な一意文字列）
--   fifa_code お気に入りの FIFA 3文字コード（大文字）
-- PRIMARY KEY(user_id, fifa_code) で「1ユーザー×同一コードは1行」を保証する。
-- 未ログイン時は従来どおり localStorage に保持し、初回ログイン時にここへマージする。
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id TEXT NOT NULL,
  fifa_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, fifa_code)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
