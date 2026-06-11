-- #38: 出場選手の在籍クラブ（設計: notes/design-38-player-clubs.md）
-- clubs はマスタ（wiki_title で名寄せ）。players.club_id は NULL 可（無所属・未取得）。

CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ja TEXT,
  country_iso TEXT,
  wiki_title TEXT NOT NULL UNIQUE,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

ALTER TABLE players ADD COLUMN club_id TEXT REFERENCES clubs(id);

CREATE INDEX IF NOT EXISTS idx_players_club ON players(club_id);
