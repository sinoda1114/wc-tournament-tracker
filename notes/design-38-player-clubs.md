# #38 設計: 出場選手の在籍クラブ（大会登録時点）

最終更新: 2026-06-11 / ステータス: 設計確定・実装待ち

## 結論（要約）

- **データ源は既存と同じ** Wikipedia「2026 FIFA World Cup squads」の wikitext。
  各選手行に `club=[[記事タイトル|表示名]]` と `clubnat=GER` が**全選手分すでに含まれている**
  （2026-06-11 実データで確認。チェコの section=2 で 26 行全てに club= あり）。
- よって TheSportsDB の選手 lookup（1国10名上限・レート制限）は**不要**。
  追加 API コールほぼゼロで、既存 `scripts/fetch-squads.ts` のパーサ拡張だけで実現できる。
- 「2026-06-01 時点の在籍」≒ 大会登録名簿のクラブ表記そのもの（移籍市場は大会後に動く）。
  Wikipedia の squads ページが事実上その正本。

## データ構造（migration 0011_player_clubs.sql）

```sql
-- クラブのマスタ（正規化する。理由は後述）
CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,              -- slug（wiki_title から生成。例 'sk-slavia-prague'）
  name_en TEXT NOT NULL,            -- 表示名（例 'Slavia Prague'。リンクの表示側）
  name_ja TEXT,                     -- 日本語名（無ければ NULL → UI は name_en を表示）
  country_iso TEXT,                 -- 所属リーグ国の旗用 ISO2（clubnat → 既存 CODE_TO_ISO で変換）
  wiki_title TEXT NOT NULL UNIQUE,  -- 英語版記事タイトル（名寄せの一意キー・日本語名解決にも使う）
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- players にクラブ参照を追加（1選手:1クラブ。履歴は持たない＝WC2026限定サービスなので YAGNI）
ALTER TABLE players ADD COLUMN club_id TEXT REFERENCES clubs(id);
CREATE INDEX IF NOT EXISTS idx_players_club ON players(club_id);
```

### 正規化（clubs テーブルを分ける）理由

1. **重複排除**: 選手 1,245 人に対しクラブは数百。表示名の揺れ（`SK Slavia Prague` vs `Slavia Prague`）を
   `wiki_title` で名寄せできる。
2. **日本語名を1箇所で管理**: クラブ名の和訳は clubs.name_ja 1行直せば全選手に反映。
3. **クラブ別集計が可能になる**: 「レアル・マドリードから何人出場？」のような将来機能が
   `GROUP BY club_id` だけで作れる（players に文字列で持つと作れない）。

### 名寄せルール

- 一意キーは **`wiki_title`（リンク先記事タイトル）**。表示名ではない
  （`[[SK Slavia Prague|Slavia Prague]]` → wiki_title='SK Slavia Prague', name_en='Slavia Prague'）。
- リンクが無い稀ケース（赤リンク等）は表示名を wiki_title として扱いフォールバック。
- `id` は wiki_title の slug 化（小文字・非英数→ハイフン）。衝突時は数字サフィックス。

## 取得フロー（scripts/fetch-squads.ts の拡張）

1. 既存の wikitext パースで `club=` / `clubnat=` を追加抽出（**追加リクエスト 0**）。
2. クラブをユニーク化 → `clubs` を upsert（wiki_title 基準）。
3. `players.club_id` を更新（既存の INSERT に列追加）。
4. **日本語クラブ名**: 既存の `fetchJaNames`（en→ja langlinks・50件/バッチ）をクラブの
   wiki_title 群にもう1周流用。クラブ数 ~400 として **約8リクエスト**。
   取れないクラブは NULL（UI は英語名表示）。
5. 冪等: 全量 upsert（既存方式と同じ）。再実行で安全。

## UI（最小スコープ）

- `SquadPanel` の選手行に **クラブ名（ロケール対応）＋ clubnat の小旗** を追加。
- ja ロケール: name_ja ?? name_en。他ロケール: name_en。
- クラブ別集計ページは**今回は作らない**（YAGNI。club_id があるのでいつでも作れる）。

## やらないこと（スコープ外）

- 移籍履歴・期限付き移籍の親クラブ管理（大会限定サービスに不要）
- クラブのエンブレム画像（商標リスク。文字＋国旗のみ）
- TheSportsDB の選手 API 利用（不要になった）

## 実装ステップ（実装時のチェックリスト）

1. migration 0011 作成・ローカル適用
2. fetch-squads.ts: club パース＋clubs upsert＋players.club_id（単体テスト: パーサに club 期待値追加）
3. 日本語クラブ名の langlinks 解決
4. 本番 Turso へ migration 適用（番人/デプロイ手順に準拠）→ `npm run db:fetch-squads`
5. SquadPanel 表示＋i18n（必要キーは squad セクションに追加）
6. 2段ゲート → PR

## リスク・注意

- Wikipedia の squads ページは大会直前に編集が活発。取得タイミングで欠けがあれば再実行で追従。
- `clubnat` は FIFA/IOC 系 3 文字コード。既存 `CODE_TO_ISO` に無いコードが出たら追記
  （未知コードは旗なし表示に落とす。fail-soft）。
- 「無所属（Free agent）」表記の選手が稀にいる → clubs に 'free-agent' を作らず club_id NULL とする。
