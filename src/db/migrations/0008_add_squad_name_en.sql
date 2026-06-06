-- 選手・監督名を「英語名(name_en・常に英語)」と「日本語名(name_ja・取得できた国のみ)」に分離。
-- 既存の name は後方互換のため残す（再取得で name=英語名 に揃う）。
ALTER TABLE players ADD COLUMN name_en TEXT;
ALTER TABLE players ADD COLUMN name_ja TEXT;
ALTER TABLE coaches ADD COLUMN name_en TEXT;
ALTER TABLE coaches ADD COLUMN name_ja TEXT;
