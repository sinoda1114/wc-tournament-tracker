PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name_ja TEXT NOT NULL,
  name_en TEXT NOT NULL,
  fifa_code TEXT NOT NULL UNIQUE,
  flag TEXT NOT NULL,
  group_name TEXT
);

CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY,
  stadium_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  country_flag TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY,
  stage TEXT NOT NULL CHECK (
    stage IN (
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

CREATE TABLE IF NOT EXISTS bracket_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_match_id INTEGER NOT NULL REFERENCES matches(id) ON UPDATE CASCADE ON DELETE CASCADE,
  from_result TEXT NOT NULL CHECK (from_result IN ('winner', 'loser')),
  to_match_id INTEGER NOT NULL REFERENCES matches(id) ON UPDATE CASCADE ON DELETE CASCADE,
  to_slot TEXT NOT NULL CHECK (to_slot IN ('home', 'away')),
  UNIQUE (from_match_id, from_result, to_match_id, to_slot),
  CHECK (from_match_id != to_match_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_stage ON matches(stage);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_venue_id ON matches(venue_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_bracket_edges_from_match_id ON bracket_edges(from_match_id);
CREATE INDEX IF NOT EXISTS idx_bracket_edges_to_match_id ON bracket_edges(to_match_id);
