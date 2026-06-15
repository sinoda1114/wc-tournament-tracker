-- T-90: 試合詳細にハイライト欄を追加する。
-- 初期版は「自前の短い要約文 + 公式外部リンク」の手動登録のみ。
-- いずれも任意（NULL 可）。本文または URL がある試合だけ画面に欄を出す。
--   highlight_summary      … 自前で書いた短い見どころ要約（実況文や公式記事のコピペ不可）
--   highlight_url          … 公式ハイライトの外部URL（FIFA公式/正規放送局/権利者の公式チャンネル等のみ）
--   highlight_source_label … リンク元の表示ラベル（例: 「FIFA公式」「FOX Sports公式」）
ALTER TABLE matches ADD COLUMN highlight_summary TEXT;
ALTER TABLE matches ADD COLUMN highlight_url TEXT;
ALTER TABLE matches ADD COLUMN highlight_source_label TEXT;
