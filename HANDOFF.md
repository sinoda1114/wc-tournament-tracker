# HANDOFF.md — WC Tournament Tracker 引継書

> 別セッションでこのドキュメントだけ読めば作業を継続できることを目的とした引継書です。最終更新: 2026-05-25（マイグレーション複数ファイル対応・キックオフ時刻追加）。

---

## 1. プロジェクト概要

FIFAワールドカップ2026 決勝トーナメント（Match 73〜104、計32試合）の進行を表示・編集する小規模Webアプリ。

- **観客（公開画面）**: トーナメント全体をブラケット図またはカード一覧で閲覧し、各試合詳細ページへ遷移できる。
- **運営（管理画面）**: 簡易パスワード認証でログインし、スコアと勝者を入力。保存すると `bracket_edges` を辿って勝者は次の試合へ、決勝1回戦（準決勝）の敗者は3位決定戦へ自動反映される。

実質のSPEC/RQD相当の要件は README.md と本ドキュメント、そしてSQL正本（`src/db/migrations/0001_initial.sql`）に集約されている（独立した SPEC.md / RQD.md ファイルは未作成）。

主要画面:

- `/` ブラケットビュー（既定）／カードビューをトグルで切替
- `/matches/[id]` 試合詳細
- `/admin/login` 管理ログイン
- `/admin` 試合一覧・編集導線
- `/admin/matches/[id]` 試合編集フォーム

---

## 2. 技術スタック

| 区分 | 採用 | バージョン |
| --- | --- | --- |
| フレームワーク | Next.js (App Router) | 15.3.3 |
| UIライブラリ | Mantine (`@mantine/core` / `@mantine/form` / `@mantine/hooks`) | 7.17.8 |
| React | React / React DOM | 19.1.0 |
| DBクライアント | `@libsql/client`（Turso／libSQL用） | 0.15.15 |
| 国旗 | `flag-icons` (CSSスプライト) | 7.5.0 |
| テスト | Vitest（`@vitest/coverage-v8`） | 2.1.9 |
| ランナー | `tsx`（マイグレーション/seed/check用） | 4.19.4 |
| 型 | TypeScript | 5.8.3 |
| Lint | ESLint 9 + `eslint-config-next` | 9.27.0 / 15.3.3 |
| 環境変数 | `dotenv` | 17.4.2 |
| PostCSS | `postcss-preset-mantine` + `postcss-simple-vars` | 1.17.0 / 7.0.1 |

### Drizzle を採用しなかった経緯

スキーマがシンプル（4テーブル・1マイグレーション）で、`bracket_edges` を介する進行ロジックは生SQLの方が宣言的に書ける。Drizzleを入れると以下のコストが嵩むため不採用にした:

1. マイグレーション生成・適用の二重管理（生成SQLとTSスキーマの同期負担）。
2. libSQL × Drizzleドライバ周りの追加検証コスト。
3. プロジェクトの寿命（試合期間限定）に対してオーバースペック。

結論として **SQL正本（`src/db/migrations/0001_initial.sql`）を唯一の真実** とし、TS層は `@libsql/client` を直接叩く方針に統一した。

---

## 3. ディレクトリ構成

```
wc-tournament-tracker/
├── src/
│   ├── app/                  Next.js App Router
│   │   ├── layout.tsx        ルートレイアウト（Mantine/flag-iconsのCSSをimport）
│   │   ├── providers.tsx     MantineProvider（dark, primary=green）
│   │   ├── globals.css       独自CSS（CSS変数 --wc-* とブラケット線）
│   │   ├── page.tsx          公開トップ（ビュートグル）
│   │   ├── matches/[id]/page.tsx        試合詳細
│   │   ├── admin/page.tsx               管理一覧
│   │   ├── admin/login/page.tsx         管理ログイン
│   │   ├── admin/matches/[id]/page.tsx  試合編集
│   │   └── admin/actions.ts             Server Actions（login/logout/update）
│   ├── components/           UIコンポーネント
│   │   ├── BracketLayout.tsx       左右ペア構造のブラケット（中央に決勝/3位決定戦）
│   │   ├── BracketMiniCard.tsx     ブラケット用ミニカード
│   │   ├── TournamentBracket.tsx   ステージ別カードビュー
│   │   ├── TournamentViewToggle.tsx 公開トップのビュートグル
│   │   ├── MatchCard.tsx           試合カード
│   │   ├── TeamBadge.tsx           国旗+チーム名+スコア
│   │   ├── VenueBadge.tsx          会場表示
│   │   ├── CountryFlag.tsx         FIFAコード→ISO変換のうえ flag-icons を描画
│   │   ├── SiteHeader.tsx          ヘッダー
│   │   ├── AdminMatchForm.tsx      管理用入力フォーム
│   │   └── AdminLoginForm.tsx      管理ログインフォーム
│   ├── db/
│   │   ├── client.ts         libSQLクライアントのシングルトン + テスト差し替えAPI
│   │   ├── queries.ts        listTournamentMatches / getMatchDetail / updateMatchResult / propagateMatchResult / resolveLoserTeamId
│   │   ├── seed.ts           seedテーブル投入（upsert）
│   │   └── migrations/0001_initial.sql  ★ SQL正本
│   ├── data/                 seed原本（TypeScript配列）
│   │   ├── seed-teams.ts     32ヶ国 + groupName + roundOf32Assignments
│   │   ├── seed-venues.ts    15会場（USA/CAN/MEX）
│   │   ├── seed-matches.ts   32試合（id 73〜104, stage, matchDate, venueId, home/awaySlot）
│   │   └── seed-bracket-edges.ts  進行先エッジ（winner×30 + loser×2 = 32本）
│   └── lib/
│       ├── bracket.ts        STAGE_ORDER / STAGE_LABELS / STATUS_LABELS / formatMatchDate / formatSlotLabel / groupMatchesByStage / isWinner / getParticipantLabel
│       ├── flags.ts          FIFAコード→ISOコードマップ
│       └── auth.ts           簡易管理者認証（Cookieセッション）
├── scripts/
│   ├── migrate.ts            0001_initial.sql を1文ずつ実行
│   └── check.ts              本番Tursoの行数/ステージ別件数/エッジ件数を確認
├── tests/
│   ├── unit/bracket.test.ts          14件（lib/bracket の純粋関数）
│   └── integration/queries.test.ts   8件（in-memory libsqlで propagation を検証）
├── postcss.config.cjs        postcss-preset-mantine + simple-vars
├── vitest.config.ts          alias `@`→`./src`、Node環境、tests/**/*.test.ts
├── next.config.ts            reactStrictMode のみ
├── tsconfig.json             paths `@/*`→`./src/*`
├── eslint.config.mjs         next/core-web-vitals + next/typescript
├── .env.example              TURSO_DATABASE_URL / TURSO_AUTH_TOKEN / ADMIN_PASSWORD
├── .env.local                ★ 実値（gitignore済み・本書には記載しない）
├── README.md                 ユーザー向け簡易ドキュメント
└── HANDOFF.md                本ファイル
```

---

## 4. データベース

### 接続先

**Turso（libSQL）クラウド** に既に投入済み。接続情報は `.env.local` に既存。

### スキーマ正本

`src/db/migrations/` 配下のSQLファイル群が正本。Drizzleなどのコード生成は使わず、これらのファイルを唯一の真実とする。

- `0001_initial.sql`: 初期スキーマ（4テーブル + 6インデックス）。
- `0002_add_kickoff_at.sql`: `matches` テーブルに `kickoff_at TEXT NULL`（ISO 8601 タイムゾーン付き）を追加。

スキーマを変えるときは既存ファイルを編集せず、`0003_*.sql` ... のように **新規マイグレーションを追加する**。`scripts/migrate.ts` は `_migrations` テーブル（`id` / `name UNIQUE` / `executed_at`）で実行履歴を管理し、`migrations/` 配下の `*.sql` を名前順に未実行のものだけ流す。`ALTER TABLE ADD COLUMN` のような再実行不能な文も安全。

#### 既存DB保護（重要）

`_migrations` テーブルが空（初回作成直後）でかつ `teams` / `venues` / `matches` / `bracket_edges` の4テーブルが既に存在する場合、`migrate.ts` は `0001_initial.sql` を実行済みとして記録する（中身は `CREATE TABLE IF NOT EXISTS` なので壊れないが、運用履歴の整合性を保つため明示的にスキップ扱い）。これにより、本番Turso（既に0001適用済み）に対して `npm run db:migrate` を流しても 0001 は再実行されず、0002 以降だけが順番に適用される。

### テーブル概要

| テーブル | 行数 | 概要 |
| --- | --- | --- |
| `_migrations` | n | 実行済みマイグレーション履歴（`id` / `name UNIQUE` / `executed_at`）。`scripts/migrate.ts` が管理。 |
| `teams` | 32 | id, name_ja, name_en, fifa_code(UNIQUE), flag(絵文字), group_name |
| `venues` | 15 | id, stadium_name, city, state, country, country_code, country_flag |
| `matches` | 32 | id(73〜104), stage, match_date, **kickoff_at**, venue_id, home_slot, away_slot, home/away_team_id, home/away_score, winner_team_id, status, timestamps |
| `bracket_edges` | 32 | from_match_id, from_result(`winner`/`loser`), to_match_id, to_slot(`home`/`away`) |

> `matches.kickoff_at` は ISO 8601 タイムゾーン付き文字列（例: `"2026-06-28T12:00:00-07:00"`）。値の出典は FIFA 公式スケジュール（米国 dispatch.com の ET 表記 / 英国 Paddy Power の BST 表記から会場ローカルへ換算、worldcupwiki.com で決勝・SF・3位戦の ET 時刻を相互確認）。表示時に `src/lib/bracket.ts` の `formatKickoffJst()` で `Asia/Tokyo` に変換し `HH:mm` で出す。

### `bracket_edges` の内訳

- **winner エッジ（30本）**: R32→R16 (16本), R16→QF (8本), QF→SF (4本), SF→Final (2本)
- **loser エッジ（2本）**: SF(101/102) の敗者を 3位決定戦 (103) に注入

3位決定戦は決勝（104）の敗者を入れるのではなく、**準決勝2試合の敗者を入れる** のが FIFA の通常運用に従った設計。

### 制約（要点）

- `status='finished'` のとき `winner_team_id` は必須。
- `winner_team_id` は `home_team_id` か `away_team_id` のいずれかと一致しなければならない（DB制約で担保）。
- 外部キーは `ON UPDATE CASCADE / ON DELETE SET NULL or RESTRICT`。
- インデックス: stage, match_date, venue_id, status, bracket_edges.from_match_id / to_match_id。

---

## 5. 実装済み機能

### 公開画面

- `/` で `TournamentViewToggle` により以下を切替:
  - **ブラケットビュー**（既定）: `BracketLayout` が左右ペア構造で R32〜SF を配置し、中央セルに 🏆決勝 + 🥉3位決定戦 を縦に積む。試合間の接続線は CSS の `::before` / `::after` で描画（CSS変数 `--wc-line-gap`）。
  - **カードビュー**: `TournamentBracket` がステージ別の縦スタック。
- `/matches/[id]` で試合詳細（対戦、スコア、ステータス、会場）を表示。

### 試合進行ロジック

- `updateMatchResult` (`src/db/queries.ts`) が `home_score` / `away_score` / `winner_team_id` / `status` を更新し、その後 `propagateMatchResult` が `bracket_edges` を辿って次の試合の `home_team_id` / `away_team_id` を書き換える。
- 勝者 ID は明示指定がなければスコア差で自動判定。同点で `status='finished'` のときは `winnerTeamId` 必須（PK決着想定）。
- 敗者 ID は `resolveLoserTeamId` で算出。`bracket_edges` の `from_result='loser'` 行がある場合に 3位決定戦へ流れる。
- 同じ試合を再編集すると、過去の伝播を上書きする（テスト済み）。

### 管理画面

- `/admin/login` で `ADMIN_PASSWORD` と一致すれば Cookie `wc_admin_session` を発行（httpOnly, sameSite=lax, production時のみ secure）。
- `/admin` で全試合の一覧テーブル。各行から `/admin/matches/[id]` へ。
- `/admin/matches/[id]` で `AdminMatchForm` を表示。保存時は `revalidatePath` で `/`, `/matches/[id]`, `/admin`, `/admin/matches/[id]` を再検証。

### 表記の日本語化

`src/lib/bracket.ts` の `formatSlotLabel` がスロット文字列を変換する:

| 入力（英語） | 出力（日本語） |
| --- | --- |
| `Winner match 73` | `勝者 #73` |
| `Runner-up match 101` | `敗者 #101` |
| `Group A winners` | `グループA 1位` |
| `Group B runners-up` | `グループB 2位` |
| `Group C/D/F/G/H third place` | `グループ C/D/F/G/H の3位` |

- 日付は `formatMatchDate('2026-06-28')` → `6/28(日)` の形式（年を出さず曜日を日本語1文字で）。
- ステージは `STAGE_LABELS` で「ラウンド32 / ラウンド16 / 準々決勝 / 準決勝 / 3位決定戦 / 決勝」。
- ステータスは `STATUS_LABELS` で「予定 / 試合中 / 終了」。
- ブラケットの中央セルでは 🏆「決勝」、🥉「3位決定戦」を見出しに表示。

### 国旗アイコン

- `CountryFlag` コンポーネントが `flag-icons` の CSSスプライトを利用（`<span class="fi fi-jp" />` 形式）。
- `src/lib/flags.ts` の `fifaToIso` が FIFAコード（JPN, ENG, USA, …）を ISO 2文字または `gb-eng` 等に変換。未マップ時は 🏳️ フォールバック。
- ENG（イングランド）は `gb-eng` 表記で flag-icons の英国地域旗を使用。

---

## 6. テスト

- **件数**: 22件（unit 14 + integration 8）すべて緑。
- **コマンド**: `npm test`（`vitest run`）／ウォッチは `npm run test:watch`。
- **環境**: Node環境、`tests/**/*.test.ts` を対象、テストタイムアウト 15s。
- **integration**: `createClient({ url: ':memory:' })` でin-memory libsqlを立て、`src/db/migrations/` 配下の `*.sql` を名前順に1文ずつ実行（複数マイグレーション対応） → 最小フィクスチャ投入 → `setDbForTesting` で差し替え → `updateMatchResult` の挙動を検証。
- **検証している主なケース**:
  - スコア差で勝者自動判定
  - SF→Final の伝播
  - SF敗者の3位決定戦への伝播
  - 同点でも `winnerTeamId` 明示なら成立（PK決着）
  - 同点 + 勝者未指定の `finished` は拒否
  - 再編集時の上書き
- **UIテスト**: 未導入。次セッションで `@testing-library/react` の導入を検討する余地あり（特に `BracketLayout` の左右ペア配置／`AdminMatchForm` のクライアント挙動）。

### TDD原則

純粋ロジックは TDD で守る。対象:

- `resolveLoserTeamId` / `propagateMatchResult`（queries.ts）
- `formatSlotLabel` / `formatMatchDate` / `groupMatchesByStage` / `isWinner` / `getParticipantLabel`（bracket.ts）

UIレイアウト（CSS線・グリッドなど）はまだテスト化していない。

---

## 7. 既知の問題

### 7-1. CSS未ロード問題（重要・調査中）

`npm run dev` で起動した dev サーバーで、ある条件下で CSS が読み込まれず素のHTMLになる現象が観測されている。

- 関連ファイル: `src/app/layout.tsx`（`@mantine/core/styles.css` と `flag-icons/css/flag-icons.min.css` を import）、`src/app/globals.css`、`postcss.config.cjs`。
- 別サブエージェントが調査中。HMRや `.next` キャッシュとの相性が疑わしい。`.next` を削除して再起動すると一時的に解消することがある。
- ブラウザのネットワークタブで `/_next/static/css/app/layout.css` のステータスを確認するのが切り分けの第一歩。

### 7-2. OneDrive同期問題（重要）

ワークスペースが OneDrive 配下（`C:\Users\sinod\OneDrive\Dev\wc-tournament-tracker`）にあるため、編集が OneDrive のクラウド同期に巻き込まれ、保存したはずの変更が消える事象が複数回発生している。

- 対策候補: プロジェクトを OneDrive 外（例: `C:\Dev\wc-tournament-tracker`）に移設する。`.next` ディレクトリも OneDrive の同期対象になりやすく、起動が重くなる原因。
- 暫定対応: OneDrive 設定で `node_modules` / `.next` を「常にこのデバイスに保持」設定にする／同期除外する。

### 7-3. Next.js 15.3.3 の既知CVE

`next@15.3.3` には既知の脆弱性警告がある。本番デプロイ前に最新のパッチ版（15.3.x の最終版または 15.4+）へ更新する。更新時は App Router・Server Actions・`cookies()`／`params: Promise` 互換性を再確認。

### 7-4. その他の小さな課題

- ブラケットの接続線は CSS の擬似要素で描画しているため、ペア配置が崩れると線が合わなくなる。`--wc-line-gap` と `wc-bracket` の `grid-template-columns` がチューニングポイント。
- 敗者ルート（loser edge）の描画は現状ない。SF敗者→3位決定戦の流れを線で示すなら別途実装が必要。
- `seedTeams` は仮データ（実在国 + 仮想割当）であり、本物のグループ抽選結果ではない。

---

## 8. 環境変数

`.env.example` を参考に `.env.local`（gitignore済み）に記載する。**値そのものは本書には記載しない**。

| 変数名 | 用途 |
| --- | --- |
| `TURSO_DATABASE_URL` | Turso（libSQL）の接続URL |
| `TURSO_AUTH_TOKEN` | Turso認証トークン |
| `ADMIN_PASSWORD` | 管理画面の簡易ログインパスワード |

`scripts/migrate.ts` / `scripts/check.ts` / `src/db/seed.ts` は冒頭で `dotenv` を呼んで `.env.local` → `.env` の順に読み込む。Next.js 側は通常通り `.env.local` を自動で読み込む。

---

## 9. コマンド一覧

```bash
npm install            # 初期セットアップ
npm run dev            # 開発サーバー（http://localhost:3000）
npm run build          # 本番ビルド
npm run start          # ビルド済みを起動
npm run lint           # ESLint
npm test               # vitest run（22件）
npm run test:watch     # vitest --watch

npm run db:migrate     # scripts/migrate.ts（0001_initial.sql を実行）
npm run db:seed        # src/db/seed.ts（teams/venues/matches/edges を upsert）

npx tsx scripts/check.ts  # 行数・ステージ別件数・エッジ件数を確認
```

`.env.local` を変更したら dev サーバーを再起動する。

---

## 10. 次のタスク候補

優先度順（上ほど重要）:

1. **CSS未ロード問題の調査完了確認 / 再現条件と修正の合意**。`.next` 削除で消えるなら HMR キャッシュが原因の可能性。Next.js 15.3.x の挙動も併せて検証。
2. **Next.js を 15.3 の最新パッチか 15.4 系へアップグレード**（CVE対応）。
3. **OneDrive 外への移設**。`C:\Dev\wc-tournament-tracker` などに移すと dev サーバーの安定性が大幅改善するはず。
4. **`teams` の本物データ反映**。抽選結果が出たら `src/data/seed-teams.ts` と `roundOf32Assignments` を差し替えて `npm run db:seed` を流す。
5. **ブラケットの接続線の微調整**。特に R16↔QF と QF↔SF の縦線位置／中央セルの決勝・3位決定戦の整列。
6. **敗者ルートの描画**。SF→3位決定戦の流れを点線などで可視化。
7. **E2Eテスト導入**（Playwright か Cypress）。
8. **UIテスト導入**（`@testing-library/react`）で `BracketLayout` のペア構造と `AdminMatchForm` のクライアント挙動を守る。
9. **管理画面の認証強化**。現状は平文パスワードを Cookie にそのまま入れているMVP実装なので、本番運用前にハッシュ化／署名付きトークンに置き換える。

---

## 11. 重要な設計判断

### 11-1. Drizzle ではなく SQL を正本に

- 4テーブル・1マイグレーションで完結する小規模スキーマ。
- 進行ロジックは `bracket_edges` を 1〜2 クエリで辿るだけなので生SQLが宣言的。
- Drizzleで得られる型補完よりも、SQL正本を直接編集できる学習コストの低さを優先。

### 11-2. `home_slot` / `away_slot` は英語のまま保持

DB上の値は `Winner match 97`, `Group A runners-up`, `Group C/D/F/G/H third place` のような英語文字列で持つ。表示時に `formatSlotLabel` が日本語へ変換する。

- 理由: スロット表現は元々FIFAの英語表記が一意で正確（特に third place の組合せ）。日本語側にロケール分岐が将来増えても、DBは変えずに表示層だけ拡張できる。

### 11-3. `bracket_edges` で進行先を表現

- 試合自体に「次の試合ID」を持たせず、`bracket_edges` テーブルで多対多関係として持つ。
- これにより winner / loser の両方向、3位決定戦のような変則ケースも同じ構造で扱える。
- seed原本は `src/data/seed-bracket-edges.ts`（winner 30 + loser 2 = 32本）。

### 11-4. ブラケットレイアウトの左右ペア構造

`src/components/BracketLayout.tsx` で **左ブロック → 中央セル → 右ブロック** の順にハードコードされた match ID 配列を並べる。

- 左右それぞれ R32（4ペア）→ R16（2ペア）→ QF（1ペア）→ SF（solo）。
- 中央セルに 🏆 決勝（104）と 🥉 3位決定戦（103）を縦に配置。
- 接続線は `globals.css` の `.wc-side-left .wc-pair::before` / `::after`（および right ミラー）で描画。CSS変数 `--wc-line-gap`（既定18px）が hub-and-spoke の幅を制御する。

このハードコードはトーナメント仕様（32チーム決勝T）が固定なので許容している。仕様が変わるとレイアウト書き換えが必要。

---

## 12. 主要ファイル早見表

| パス | 役割 |
| --- | --- |
| `src/db/migrations/0001_initial.sql` | 初期スキーマ正本（PRAGMA foreign_keys=ON, 4テーブル, 6インデックス） |
| `src/db/migrations/0002_add_kickoff_at.sql` | `matches.kickoff_at TEXT NULL` を追加（ISO 8601 + TZ オフセット） |
| `src/db/queries.ts` | `listTournamentMatches` / `getMatchDetail` / `updateMatchResult` / `propagateMatchResult` / `resolveLoserTeamId` |
| `src/db/client.ts` | libSQLクライアントのシングルトン + `setDbForTesting` / `resetDbForTesting` |
| `src/db/seed.ts` | seed upsert（4テーブル → R32割当 → bracket_edges の順） |
| `src/lib/bracket.ts` | `STAGE_ORDER` / `STAGE_LABELS` / `STATUS_LABELS` / `formatSlotLabel` / `formatMatchDate` / `formatKickoffJst` / `groupMatchesByStage` / `isWinner` / `getParticipantLabel` |
| `src/lib/flags.ts` | `fifaToIso`（FIFAコード→ISO）、`venueCountryToIso` |
| `src/lib/auth.ts` | `ADMIN_SESSION_COOKIE` / `isAdminAuthenticated` / `isValidAdminPassword` |
| `src/app/layout.tsx` | Mantine と flag-icons のCSSをimport、`ColorSchemeScript defaultColorScheme="dark"` |
| `src/app/providers.tsx` | `MantineProvider`（dark / primary=green / font Hiragino Sans） |
| `src/app/globals.css` | 独自スタイル。CSS変数 `--wc-bg` / `--wc-surface` / `--wc-accent` / `--wc-gold` / `--wc-line` / `--wc-line-gap` |
| `src/app/page.tsx` | 公開トップ（`force-dynamic` で都度フェッチ） |
| `src/app/matches/[id]/page.tsx` | 試合詳細（`params: Promise<{ id }>` の Next.js 15流儀） |
| `src/app/admin/actions.ts` | Server Actions（login / logout / updateAdminMatchAction）— 全更新後に `revalidatePath` |
| `src/app/admin/page.tsx` | 管理一覧（未認証なら `/admin/login` へリダイレクト） |
| `src/app/admin/matches/[id]/page.tsx` | 試合編集（`AdminMatchForm`） |
| `src/components/BracketLayout.tsx` | 左右ペア構造のブラケット（LEFT_PAIRS / RIGHT_PAIRS / LEFT_SF_ID=101 / RIGHT_SF_ID=102 / FINAL_ID=104 / THIRD_PLACE_ID=103） |
| `src/components/BracketMiniCard.tsx` | `<Link href={/matches/[id]}>` で詳細へ。`emphasized` で決勝強調 |
| `src/components/AdminMatchForm.tsx` | クライアントコンポーネント。`useTransition` で Server Action を呼ぶ |
| `src/data/seed-teams.ts` | 32チームの仮データ + `roundOf32Assignments` |
| `src/data/seed-matches.ts` | 32試合（id 73〜104）の date / venueId / home_slot / away_slot |
| `src/data/seed-bracket-edges.ts` | 32本のエッジ定義 |
| `scripts/migrate.ts` | `migrations/*.sql` を名前順に未実行のものだけ実行。`_migrations` テーブルで履歴管理。既存DB保護ロジック付き |
| `scripts/check.ts` | テーブル件数とステージ別件数・エッジ件数を出力（ヘルスチェック用） |
| `tests/unit/bracket.test.ts` | lib/bracket の純粋関数の単体テスト |
| `tests/integration/queries.test.ts` | in-memory libsql で `updateMatchResult` と propagation を検証 |
| `vitest.config.ts` | alias `@`→`./src`、`tests/**/*.test.ts` |
| `postcss.config.cjs` | `postcss-preset-mantine` + Mantine breakpoint 変数 |
| `.env.example` | 環境変数のテンプレ |

---

## 13. 開発のコツ

### 13-1. 試合進行の検証フロー

1. `npm run db:seed` で初期状態に戻す（既存行は upsert なので安全）。
2. ブラウザで `/admin/login` → ログイン → `/admin/matches/97` などで結果を入力 → 保存。
3. `/` で次の試合（M101）にチームが流れているか確認。
4. SF (101) と (102) を両方確定させると、決勝 (104) と 3位決定戦 (103) の両方に自動反映される。
5. `npx tsx scripts/check.ts` で件数の整合性を確認。

### 13-2. レイアウト調整

- 縦線・横線が崩れたら `globals.css` の `--wc-line-gap` と `.wc-side-left/.wc-side-right` の `::before`/`::after` を見る。
- ブラケット全体の幅は `.wc-bracket { min-width: 1700px }` でスクロール前提。スマホは横スクロールで全体閲覧。

### 13-3. テスト追加の指針

- 純粋関数（lib/）と `queries.ts` の伝播ロジックは TDD 必須。
- UIは現状未テストだが、次セッションで `@testing-library/react` を入れる場合は `BracketLayout` のペア構造（match IDの並び）から守ると効果が高い。

### 13-4. データ更新

抽選結果や日程変更が出たら:

1. `src/data/seed-*.ts` を編集。
2. `npm run db:seed` を実行（既存行は upsert で更新される）。
3. `npx tsx scripts/check.ts` で件数を確認。

スキーマ自体を変えるときは `src/db/migrations/0003_*.sql`... のように新規ファイルを追加するだけでよい。`scripts/migrate.ts` が `_migrations` テーブルで履歴管理し、未実行のものだけ名前順に流す。`ALTER TABLE ADD COLUMN` も2回目以降は自動でスキップされるので、本番（既に0001適用済み）に対しても安全に流せる。

---

## 14. 補足

- **Server Components / Server Actions**: 公開・管理どちらも基本サーバーコンポーネント。フォームのみ `'use client'`（`AdminMatchForm`, `AdminLoginForm`, `TournamentViewToggle`）。
- **revalidate戦略**: ページは `export const dynamic = 'force-dynamic'` で都度フェッチ。Server Action 後は `revalidatePath` で関連ページを再生成。
- **コミット粒度**: 通常通り機能単位の小さなコミット。push 前のレビューフロー（`/ai-review` → コミット → `/security-review`）はワークスペース全体のルールに従う。
- **絵文字**: ヘッダーの 🏆 / 🥉 と venue の 📍 を除き、UIでは多用しない方針。

以上。本書だけで作業継続できるはずです。不明点は README.md と各 `*.ts` のコメントを参照してください。
