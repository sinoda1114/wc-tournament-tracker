-- 0009_match_events.sql
-- 試合イベント（得点・カード・交代）。2段構え:
--   source='auto'   … 外部(TheSportsDB)からの自動取得（external_id で冪等 upsert）
--   source='manual' … 管理画面での手動入力/補正
-- 再取得(auto upsert)は manual 行を上書きしない運用（queries 側で担保）。
CREATE TABLE IF NOT EXISTS match_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON UPDATE CASCADE ON DELETE CASCADE,
  -- イベント種別
  type TEXT NOT NULL CHECK (
    type IN ('goal', 'own_goal', 'penalty_goal', 'yellow_card', 'red_card', 'substitution')
  ),
  -- 起きた分（0..130。延長・アディショナルを許容。NULL=不明）
  minute INTEGER CHECK (minute IS NULL OR (minute >= 0 AND minute <= 130)),
  -- どちらのチームの出来事か（チーム未確定時は NULL 可）
  team_id TEXT REFERENCES teams(id) ON UPDATE CASCADE ON DELETE SET NULL,
  -- 主体選手（得点者 / カード対象 / 交代IN）
  player_name TEXT NOT NULL,
  -- 補助選手（アシスト / 交代OUT）。交代は player_name=IN, player_out=OUT。
  player_out TEXT,
  -- 同分イベントの安定ソート補助（未指定は 0）
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- データ起源。manual を auto 再取得で上書きしない。
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('auto', 'manual')),
  -- 自動取得の冪等キー（外部イベントID）。手動入力は NULL。
  external_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id);

-- 自動取得の冪等性: 同一試合×external_id は1行（auto upsert 用）。
-- 手動行(external_id IS NULL)はこの一意制約の対象外。
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_events_external
  ON match_events(match_id, external_id)
  WHERE external_id IS NOT NULL;
