-- 0004_add_venue_details.sql
-- 会場の追加情報を venues に持たせる:
--   capacity        収容人数（FIFA WC2026 運用時）
--   roof_type       屋根タイプ 'retractable'（開閉式+空調）/ 'translucent'（半屋根）/ 'open'（屋外）
--   elevation_m     標高（メートル）。高地の語り所になるメキシコ会場のみ値を持ち、他は NULL。
--   past_world_cups 過去の男子W杯本大会開催歴を JSON 文字列で格納（例 '[{"year":1970,"final":true}]'）。
--
-- すべて NULL 許容の ADD COLUMN。再実行は scripts/migrate.ts の _migrations 履歴で防止される。
-- CHECK 制約は SQLite の ALTER TABLE では後付けしにくいため、値の正しさはアプリ層（seed の型）で担保する。
ALTER TABLE venues ADD COLUMN capacity INTEGER;
ALTER TABLE venues ADD COLUMN roof_type TEXT;
ALTER TABLE venues ADD COLUMN elevation_m INTEGER;
ALTER TABLE venues ADD COLUMN past_world_cups TEXT;
