-- PK決着試合の延長後スコアを保存する。
-- home_score / away_score は 90+120分スコア（変更なし）。
-- penalty_home_score / penalty_away_score が null でない場合 PK が行われた。
ALTER TABLE matches ADD COLUMN penalty_home_score INTEGER CHECK (penalty_home_score IS NULL OR penalty_home_score >= 0);
ALTER TABLE matches ADD COLUMN penalty_away_score INTEGER CHECK (penalty_away_score IS NULL OR penalty_away_score >= 0);
