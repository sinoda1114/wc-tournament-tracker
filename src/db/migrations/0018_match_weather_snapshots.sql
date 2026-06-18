-- 試合詳細の天気表示を、予報APIの提供期間外に出ても残すためのスナップショット。
-- source='manual' は無料APIで補完できない過去試合を後から手入力するために予約する。
CREATE TABLE IF NOT EXISTS match_weather_snapshots (
  match_id INTEGER PRIMARY KEY REFERENCES matches(id) ON UPDATE CASCADE ON DELETE CASCADE,
  weather_date TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('forecast', 'history', 'manual')),
  max_temp_c REAL NOT NULL,
  min_temp_c REAL NOT NULL,
  condition_code INTEGER NOT NULL DEFAULT 0,
  condition_text TEXT NOT NULL DEFAULT '',
  condition_icon_url TEXT NOT NULL DEFAULT '',
  chance_of_rain INTEGER NOT NULL DEFAULT 0 CHECK (chance_of_rain >= 0 AND chance_of_rain <= 100),
  source_url TEXT,
  captured_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_match_weather_snapshots_weather_date
  ON match_weather_snapshots(weather_date);

WITH manual_snapshots (
  match_id,
  weather_date,
  source,
  max_temp_c,
  min_temp_c,
  condition_code,
  condition_text,
  condition_icon_url,
  chance_of_rain,
  source_url
) AS (
  VALUES
    (1, '2026-06-11', 'manual', 26.1, 17.2, 1006, 'Cloudy', '', 100, NULL),
    (2, '2026-06-11', 'manual', 29.8, 17.8, 1003, 'Partly cloudy', '', 47, NULL),
    (3, '2026-06-12', 'manual', 27.0, 13.6, 1003, 'Partly cloudy', '', 31, NULL),
    (4, '2026-06-12', 'manual', 23.3, 17.2, 1003, 'Partly cloudy', '', 0, NULL),
    (5, '2026-06-13', 'manual', 30.5, 17.9, 1000, 'Sunny', '', 0, NULL),
    (6, '2026-06-13', 'manual', 28.5, 14.5, 1003, 'Partly cloudy', '', 25, NULL),
    (7, '2026-06-13', 'manual', 32.2, 20.6, 1003, 'Partly cloudy', '', 0, NULL),
    (8, '2026-06-13', 'manual', 28.3, 15.0, 1000, 'Sunny', '', 0, NULL),
    (9, '2026-06-14', 'manual', 33.9, 21.1, 1006, 'Cloudy', '', 100, NULL),
    (10, '2026-06-14', 'manual', 31.1, 25.0, 1003, 'Partly cloudy', '', 100, NULL),
    (11, '2026-06-14', 'manual', 30.6, 22.2, 1003, 'Partly cloudy', '', 0, NULL),
    (12, '2026-06-14', 'manual', 32.2, 22.1, 1003, 'Partly cloudy', '', 20, NULL),
    (13, '2026-06-15', 'manual', 35.0, 25.6, 1003, 'Partly cloudy', '', 0, NULL),
    (14, '2026-06-15', 'manual', 27.2, 21.7, 1003, 'Partly cloudy', '', 0, NULL),
    (15, '2026-06-15', 'manual', 21.7, 17.2, 1000, 'Sunny', '', 1, NULL),
    (16, '2026-06-15', 'manual', 32.2, 16.7, 1000, 'Sunny', '', 0, NULL),
    (17, '2026-06-16', 'manual', 25.6, 13.3, 1000, 'Sunny', '', 0, NULL),
    (18, '2026-06-16', 'manual', 24.0, 13.6, 1003, 'Partly cloudy', '', 0, NULL),
    (19, '2026-06-16', 'manual', 27.8, 18.9, 1000, 'Sunny', '', 0, NULL),
    (20, '2026-06-16', 'manual', 25.0, 15.6, 1003, 'Partly cloudy', '', 0, NULL)
)
INSERT OR IGNORE INTO match_weather_snapshots (
  match_id,
  weather_date,
  source,
  max_temp_c,
  min_temp_c,
  condition_code,
  condition_text,
  condition_icon_url,
  chance_of_rain,
  source_url
)
SELECT
  s.match_id,
  s.weather_date,
  s.source,
  s.max_temp_c,
  s.min_temp_c,
  s.condition_code,
  s.condition_text,
  s.condition_icon_url,
  s.chance_of_rain,
  s.source_url
FROM manual_snapshots s
JOIN matches m ON m.id = s.match_id;
