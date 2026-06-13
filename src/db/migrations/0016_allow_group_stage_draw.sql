-- 0016_allow_group_stage_draw.sql
-- 引き分け試合の結果取りこぼし修正（T-62）:
--   matches の CHECK 「status != 'finished' OR winner_team_id IS NOT NULL」が
--   引き分け（勝者不在が正常）を考慮しておらず、cron 取込が 1-1 等の試合を
--   確定しようとすると DB の CHECK 違反で失敗していた。結果スコア/「終了」が
--   反映されず、イベントだけ入る不整合になっていた。
--
--   → CHECK を「終了は (勝者あり) または (両スコアあり かつ 同点=引き分け)」に緩める。
--     ・グループステージの引き分け: winner=null で確定可能に。
--     ・決勝T(KO)の引き分けは PK 決着で勝者が要る → アプリ側(updateMatchResult)が
--       group_stage 以外は引き続き winner 必須を担保する（DBは引き分けを許すが
--       アプリが KO 引き分けを通さない二段構え）。
--
-- SQLite は CHECK を ALTER TABLE で変更できないため、0003 と同じ公式推奨の
-- テーブル再作成パターン（CREATE NEW → INSERT SELECT → DROP OLD → RENAME）を使う。
-- bracket_edges は matches に FK ON DELETE CASCADE で繋がるため、先に一時退避し
-- 入れ替え後に復元する（既存データ・インデックス・FK を完全保持）。
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
  -- 終了試合は「勝者あり」または「引き分け（両スコアあり かつ 同点）」を許可。
  CHECK (
    status != 'finished'
    OR winner_team_id IS NOT NULL
    OR (home_score IS NOT NULL AND away_score IS NOT NULL AND home_score = away_score)
  )
);

INSERT INTO matches_new (
  id, stage, match_date, venue_id, home_slot, away_slot,
  home_team_id, away_team_id, home_score, away_score, winner_team_id, status,
  kickoff_at, group_letter, created_at, updated_at
)
SELECT
  id, stage, match_date, venue_id, home_slot, away_slot,
  home_team_id, away_team_id, home_score, away_score, winner_team_id, status,
  kickoff_at, group_letter, created_at, updated_at
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
