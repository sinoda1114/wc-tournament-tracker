CREATE TABLE IF NOT EXISTS coaches (
  team_id TEXT PRIMARY KEY REFERENCES teams(id),
  name TEXT NOT NULL,
  nationality TEXT,
  nationality_iso TEXT,
  date_born TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  name TEXT NOT NULL,
  position TEXT,
  date_born TEXT,
  number TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
