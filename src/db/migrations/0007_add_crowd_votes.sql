-- 0007_add_crowd_votes.sql
-- 「みんなの予想」用のユーザー投票テーブル。
--   voter_id  匿名ID（cookie 発行UUID。将来 Google アカウントIDに差し替え）
--   stage     投票ステージ（group_stage / round_of_32 / round_of_16 / quarter_final / semi_final / final）
--   team_id   優勝予想のチーム
-- UNIQUE(voter_id, stage) で「1ユーザー1ステージ1票（ロック）」を保証する。
CREATE TABLE IF NOT EXISTS crowd_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  team_id TEXT NOT NULL REFERENCES teams(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (voter_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_crowd_votes_stage ON crowd_votes(stage);
CREATE INDEX IF NOT EXISTS idx_crowd_votes_team ON crowd_votes(team_id);
