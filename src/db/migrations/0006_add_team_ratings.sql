-- 0006_add_team_ratings.sql
-- 優勝国予想機能で使う静的レーティングを teams に持たせる:
--   fifa_rank       現在の FIFA ランク（小さいほど強い）。スナップショット運用。
--   wc_2014_place   2014 ブラジル大会の最終順位（1〜32、未出場は NULL）。
--   wc_2018_place   2018 ロシア大会の最終順位（同上）。
--   wc_2022_place   2022 カタール大会の最終順位（同上）。
--
-- 直近3大会はいずれも32チーム制なので順位の母数は 32 で固定。
-- すべて NULL 許容の ADD COLUMN。再実行は scripts/migrate.ts の _migrations 履歴で防止される。
-- CHECK 制約は SQLite の ALTER TABLE では後付けしにくいため、値の正しさはアプリ層（seed の型）で担保する。
ALTER TABLE teams ADD COLUMN fifa_rank INTEGER;
ALTER TABLE teams ADD COLUMN wc_2014_place INTEGER;
ALTER TABLE teams ADD COLUMN wc_2018_place INTEGER;
ALTER TABLE teams ADD COLUMN wc_2022_place INTEGER;
