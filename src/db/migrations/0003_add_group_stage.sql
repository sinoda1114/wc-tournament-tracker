-- 0003_add_group_stage.sql
-- グループステージ対応:
--   1. matches.stage CHECK 制約に 'group_stage' を追加
--   2. matches.group_letter TEXT NULL を追加（A〜L、グループ試合のみ値あり）
--
-- SQLite は CHECK 制約を ALTER TABLE で変更できないため、公式推奨の
-- テーブル再作成パターン（CREATE NEW → INSERT SELECT → DROP OLD → RENAME）
-- を使う。bracket_edges が matches に FK ON DELETE CASCADE で繋がっており、
-- そのまま DROP TABLE matches すると暗黙の DELETE FROM matches が走って
-- bracket_edges まで巻き込まれて消えるため、先に bracket_edges を一時テーブルへ
-- 退避してから入れ替え、最後に復元する。
--
-- 既存のインデックス・FK・既存データ（teams/venues/bracket_edges/matches 全行）を
-- 完全に保つ。
CREATE TABLE _bracket_edges_backup AS SELECT * FROM bracket_edges;

DELETE FROM bracket_edges;

CREATE TABLE matches_new (
  id INTEGER PRIMARY KEY,
  stage TEXT NOT NULL CHECK (
    stage IN (
      'group_stage',
      'round_of_32',
      'round_of_16',
      'quarter_final',
      'semi_final',
      'third_place',
      'final'
    )
  ),
  match_date TEXT NOT NULL,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  home_slot TEXT NOT NULL,
  away_slot TEXT NOT NULL,
  home_team_id TEXT REFERENCES teams(id) ON UPDATE CASCADE ON DELETE SET NULL,
  away_team_id TEXT REFERENCES teams(id) ON UPDATE CASCADE ON DELETE SET NULL,
  home_score INTEGER CHECK (home_score IS NULL OR home_score >= 0),
  away_score INTEGER CHECK (away_score IS NULL OR away_score >= 0),
  winner_team_id TEXT REFERENCES teams(id) ON UPDATE CASCADE ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in_progress', 'finished')
  ),
  kickoff_at TEXT,
  group_letter TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    winner_team_id IS NULL
    OR winner_team_id = home_team_id
    OR winner_team_id = away_team_id
  ),
  CHECK (
    status != 'finished'
    OR winner_team_id IS NOT NULL
  )
);

INSERT INTO matches_new (
  id, stage, match_date, venue_id, home_slot, away_slot,
  home_team_id, away_team_id, home_score, away_score, winner_team_id, status,
  kickoff_at, created_at, updated_at
)
SELECT
  id, stage, match_date, venue_id, home_slot, away_slot,
  home_team_id, away_team_id, home_score, away_score, winner_team_id, status,
  kickoff_at, created_at, updated_at
FROM matches;

DROP TABLE matches;

ALTER TABLE matches_new RENAME TO matches;

CREATE INDEX IF NOT EXISTS idx_matches_stage ON matches(stage);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_venue_id ON matches(venue_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_group_letter ON matches(group_letter);

INSERT INTO bracket_edges (id, from_match_id, from_result, to_match_id, to_slot)
SELECT id, from_match_id, from_result, to_match_id, to_slot
FROM _bracket_edges_backup;

DROP TABLE _bracket_edges_backup
