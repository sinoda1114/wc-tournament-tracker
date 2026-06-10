# ローンチ・タスクボード（WBS / 担当割当）

**目的**: 2026-06-11 開幕に「課金込み・全員ログイン必須」でローンチ（[[launch-monetization-plan]]）。
**運用**: MAIN がオーケストレーション。各レーンは自分のセクションだけ読めば着手できる粒度。連携は本ファイル＋ `memory/`（[[agent-registry]]）。

---

## 0. 現状スナップショット（2026-06-05 実地確認）

| 項目 | 状態 |
|---|---|
| git | **未init**（`.git` 無し）→ W0 で最優先 |
| 足回り | `error/loading/not-found/global-error/sitemap/robots/manifest/middleware` **全て無し** |
| 認証/課金/監視 依存 | `@clerk` `better-auth` `stripe` `zod` `@sentry` **全て未導入** |
| env | `ADMIN_PASSWORD` `TURSO_AUTH_TOKEN` `TURSO_DATABASE_URL` のみ（`CRON_SECRET`/`STRIPE_*`/`CLERK_*` 無し） |
| 既存ルート | admin / api / favorites / groups / matches / prediction / teams（法務ページ無し） |
| 既知の乖離 | ①「Stripe使える状態」だがパッケージ未導入＝**実体要確認** ②SUB-B の `/api/ingest`(CRON_SECRET) が**このコピー未統合**の疑い |

---

## 1. 体制と担当境界（4人案・競合回避線）

| ID | 役割 | 主担当レーン | 触る領域（新規中心＝競合少） |
|---|---|---|---|
| **MAIN** (4904690c) | 統括・設計・レビュー・リリース | W0 git / W2課金の意思決定 / W9 QA・デプロイ / 認証基盤の決定 | `package.json`・`layout.tsx`・`.gitignore`・env は **MAINが集約** |
| **A** (SUB-A 3137dfcc) | データ・足回り | W4 信頼性足回り / W6 データ自動取込 本番化 | `app/error|loading|not-found|global-error`・`api/ingest` 周辺・`scripts/` |
| **B** (SUB-B 1344505b) | UI・認証連動 | W8 認証連動UI / 公開プレビュー層UI | `components/`・`prediction`・`favorites`・`globals.css`（B正本） |
| **C** (新規) | 認証・課金 実装 | W1 認証基盤 / W2 課金実装 | `middleware.ts`・`(auth)/*`・`lib/auth/*`・`lib/billing/*`・`api/stripe/*` |
| **D** (新規) | 法務・SEO・インフラ | W3 法務 / W5 SEO / W7 CI・監視・CVE | `(legal)/*`・`sitemap|robots|manifest`・`opengraph-image`・`.github/workflows`・`next.config` |

**競合回避の鉄則**
- `package.json` / `layout.tsx` / `.env*` は **MAIN が集約**。各レーンは「足したい依存・Provider・envキー」を本ファイル下部の「依頼キュー」に書く→MAINが反映。
- `globals.css` は **B が正本**。他レーンはCSSが要るならBに依頼 or スコープdrCSS Modules。
- `src/db/queries.ts` は肥大化＆競合源 → 新規は **機能別ファイル**（`queries/auth.ts`・`queries/billing.ts` 等）に分け、最後にMAINが束ねる。
- **dev は全体で1つだけ**（[[dev-server-discipline]]）。各自の検証は `tsc --noEmit` と eslint のみ。

---

## 2. WBS（W0–W9）

> 依存: 「W0」=全ての前提。「—」=W0後すぐ並列着手可。

| # | タスク | 担当 | 依存 | 主な新規ファイル / 要点 |
|---|---|---|---|---|
| **W0** | git init・`.gitignore`(node_modules/.next/.env*、**lockfileはコミット対象**)・初回コミット・lane運用 | MAIN | — | 全並列作業の前提。完了まで共有ファイル同時編集を避ける |
| **W1** | 認証基盤＝**ログイン必須化**。基盤確定→middleware保護→公開/保護の二層→匿名`wc_voter_id`をユーザーIDへ | C | W0 + **基盤決定** | `middleware.ts`・`(auth)/sign-in|sign-up`・`lib/auth/*`。Bの`ensureVoterId`差替点と連携 |
| **W2** | 課金＝**買い切り・登録72h無料・entitlement**。stripe導入→Checkout→webhook→計時→ペイウォール | C(実装)/MAIN(判断) | W1 | `lib/billing/*`・`api/stripe/webhook`・`entitlements`表。Stripe実体をMAINが確認し接続 |
| **W3** | 法務: 利用規約/プライバシー/**特商法表記**/Cookie・localStorage同意/**FIFA非公認明記・ロゴ不使用** | D | — | `(legal)/terms|privacy|tokushoho`・同意バナー。課金には特商法が**法的必須** |
| **W4** | 信頼性足回り: `error`/`global-error`/`loading`/`not-found`/DB障害フォールバック/env起動時バリデーション | A | — | `app/*`。低コスト高効果。新規ファイル中心＝競合最少 |
| **W5** | SEO/集客足回り: `sitemap`/`robots`/`manifest`(PWA)/動的OGP/構造化データ/**公開ランディング層** | D | W3と一体 | ログイン必須×SEOの矛盾を二層設計で解消（[[launch-monetization-plan]]） |
| **W6** | データ自動取込 本番化: `/api/ingest`本番化・Vercel Cron・`CRON_SECRET`設定・R32 3位通過の自動確定 | A | — | SUB-B実装を統合・本番化。手入力はフォールバック維持（[[commercial-data-constraints]]） |
| **W7** | セキュリティ/CI/監視: CI(typecheck/lint/test/build/`npm audit`)・Dependabot・Next CVE・ヘッダ・zod・Sentry | D | W0 | `.github/workflows`(**`npm ci`**)・`next.config`ヘッダ |
| **W8** | 認証連動UI: ログイン壁UI・お気に入りDB同期(localStorage→`user_favorites`)・投票のユーザー紐付け・アカウント画面・ペイウォールUI | B | W1 | `components/`・`favorites`・`prediction`。未ログインはlocalStorage→ログインでマージ |
| **W9** | 整合・QA・リリース: 2段ゲート(`/ai-review`→commit→`/security-review`)・通し検証・本番env・デプロイ | MAIN | 全部 | 開幕前の最終ゲート |

---

## 3. クリティカルパス & 6日スケジュール（叩き台）

**最長経路**: `W0 → 基盤決定 → W1 → W2 → W8/W9`（認証がボトルネック）。
**W0後すぐ並列**: W3・W4・W5・W6・W7（W1非依存）。

| 日 | MAIN | A | B | C | D |
|---|---|---|---|---|---|
| 6/6 | W0完了・基盤確定・C/Dオンボード | W4 着手 | W8設計(W1待ち) | W1 着手 | W3+W7 着手 |
| 6/7-6/8 | 統括・レビュー・Stripe実体接続 | W4完了→W6 | W8 実装 | W1完了→W2 | W3完了→W5 |
| 6/9 | W2判断・統合レビュー | W6本番化 | W8仕上げ | W2完了 | W5+W7仕上げ |
| 6/10 | **W9 通しQA・2段ゲート・デプロイ** | QA協力 | QA協力 | 課金QA | 法務/SEO最終 |
| 6/11 | **開幕・ローンチ**／予備 | 予備 | 予備 | 予備 | 予備 |

---

## 4. 未確定・要確認（MAIN管理）
1. **認証基盤**: Clerk か Better Auth（1万規模ならClerk無料枠内 vs セルフホストでサーバー代のみ）。→ W1着手の前提、要決定。
2. **Stripe実体**: 「使える状態」の中身（商品/価格/キー）。package.json未導入なので、MAINがダッシュボード設定を確認しコードへ接続。
3. **SUB-B成果の統合**: `/api/ingest`・`crowd_votes`・配色等がこのワーキングコピーに入っているか。W0(git)時に棚卸し。

## 5. 依頼キュー（各レーン→MAIN。依存追加・env・Provider はここに書く）

### C（SUB-C `1cc30e6f`）→ MAIN　※W1/W2 着手の前提。MAINで反映後に実装開始する
**ブロッカー**: ①W0=git init 未完了（`.git` 無し）②下記の依存/env 未導入。両方そろうまで C は source を書かず、設計と本キューのみ進める。

- **依存（package.json、MAIN集約）**:
  - `@clerk/nextjs`（認証=Clerk/Google。[[launch-monetization-plan]] で確定）
  - `stripe` + `@stripe/stripe-js`（買い切り Checkout + webhook）
  - 任意: `svix`（Clerk/Stripe webhook 署名検証。Clerkは`@clerk/nextjs`同梱の`verifyWebhook`でも可）
- **env（.env*、MAIN集約。`.env.example` にも追記希望）**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
  - `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID`（買い切り価格ID。MAINがStripeダッシュボードで作成・確認＝§4-2）
  - `CLERK_WEBHOOK_SECRET`（user.created を拾い72h計時を起票する場合）
  - `ADMIN_EMAILS`（カンマ区切り。admin の Clerk 移行用＝メール一致で管理者判別。SUB-B依頼／2026-06-06確定）
- **layout.tsx（MAIN集約）**: ルートに `<ClerkProvider>` 追加が必要。C が差分案を出すので MAIN が反映。
- **DBスキーマ（C が機能別migrationで用意、束ねはMAIN）**: `entitlements`（user_id, status, trial_started_at, purchased_at, ...）。`crowd_votes`/`user_favorites` の本人識別を匿名`wc_voter_id`→Clerk user_id へ移行（SUB-B `ensureVoterId` 差替点と連携、[[coordination-sub-b]]）。
- **確認したいこと**: (a) ログイン必須×SEO の二層設計境界＝「公開で見せるルート」の確定リスト（D の W5 公開ランディングと整合）。(b) 72h無料の起点＝Clerk `created_at` 基準でよいか。(c) Stripe実体（商品/価格）の現況（§4-2）。

- （他レーン未記入）

---

## 6. 各エージェント 直近の着手指示（MAIN→ABCD・2026-06-07）

> 着手は WBS の **W番号で固定参照**（[[numbered-choices]]）。各自セッションで本節＋自分の coordination メモリを読んで進める。レビュー由来の修正は出典併記。

### A（SUB-A `3137dfcc`）— データ/足回り：**今すぐ着手可**
- **W4** `error.tsx`/`global-error.tsx`/`loading.tsx`/`not-found.tsx`/DB障害フォールバック/env起動時バリデーション（新規ファイル中心＝競合なし）
- **W6** `/api/ingest` 本番化＋AIレビュー指摘：①外部fetchに `AbortController`(5〜10s)（`lib/ingest/thesportsdb.ts`）②`THESPORTSDB_KEY` を本番必須化 ③GET副作用に `Cache-Control: no-store`
- **W7一部** `updateMatchResult()` 入口に入力検証(zod)：score≥0整数/status許可値/winner=home|away/finished時の勝者要否（AIレビュー **High**）

### B（SUB-B `1344505b`）— UI/認証連動
- **テーマ** `globals.css` ライトパレット化（[[handoff-theme-light-to-sub-b]]）
- **#19 i18n** 残り groups/teams/prediction（[[i18n-implementation-status]]）
- **W8**（C の W1 後）ログイン壁/お気に入りDB同期(localStorage→`user_favorites`)/投票のユーザー紐付け/ペイウォールUI。今は設計のみ、`ensureVoterId` 差替点を C と握る

### C（SUB-C `1cc30e6f`）— 認証/課金：**ブロッカーを MAIN が今解除**
- MAIN が即実施 → deps(`@clerk/nextjs`,`stripe`,`@stripe/stripe-js`)/`.env.example` 追記/`layout.tsx` に `<ClerkProvider>`（§5 依頼キュー）
- 解除後 **W1** Clerk 認証基盤（middleware で公開/保護の二層・匿名`wc_voter_id`→user_id）→ **W2** Stripe 買い切り72h無料・entitlements
- 解除待ちは設計（公開ルート確定リスト/entitlements スキーマ/72h起点=Clerk `created_at`）

### D（SUB-D `c4702514`）— 法務/SEO/インフラ
- **W3** 法務本文（(legal) ルート実在。中身を起こす・FIFA非公認明記・**公開前に弁護士レビュー**）
- **W5** SEO：sitemap/robots/manifest/OGP/llms.txt（[[seo-llms-txt]]）。ログイン必須×SEO は公開プレビュー層で二層化
- **W7** CI：`.github/workflows`（**`npm ci`** + `npm audit --audit-level=high`）。push は `gh auth refresh -s workflow`（ユーザー操作・[[gh-workflow-scope-missing]]）。`next lint`→`eslint .`（AIレビュー Medium）

### MAIN（`4904690c`）— 今やること
1. **C ブロッカー解除**：deps 追加/`.env.example` env/`layout.tsx` ClerkProvider
2. 初回コミット（`package-lock.json` 含める＝AIレビュー Medium）
3. Stripe 実体（商品/価格ID）確認 → C へ `STRIPE_PRICE_ID` 連携

---

## 7. 認証実装タスク（AT系列・Clerk 確定 / 2026-06-08 起票）

> W1 の「基盤決定」は **Clerk で確定**（[[launch-monetization-plan]]）。Clerk ダッシュボードでアプリ登録済み。
> 実装は W1 を AT1〜AT7 に細分（[[numbered-choices]] 準拠＝番号固定・完了は取り消し線）。
> **重要訂正**: 本プロジェクトは **Next 16.2.7** のため、ミドルウェアは `middleware.ts` ではなく **`proxy.ts`**（Next 16+ の新名）。WBS 表記の `middleware.ts` は読み替え。
> 公式支援: **Clerk CLI**（`clerk link`/`clerk env pull` で env 自動配線）＋ **Clerk Skills**（`github.com/clerk/skills`＝AIエージェント用 SKILL.md）を採用。MCP は今回不要。

| # | タスク | 要点 / 触る領域 | 前提 |
|---|---|---|---|
| **AT1** | `@clerk/nextjs` 導入＋env 配線 | `clerk auth login`→`clerk link --app <既存app>`→`clerk env pull`（or 手動でキー貼付）。`.env.example` に Clerk キー追記 | 【一部ユーザー操作】Clerk ログイン/キー |
| **AT2** | root `layout.tsx` に `<ClerkProvider>` | 既存 Mantine/i18n Provider との入れ子順序を保つ。`<html>`直下の階層に配置 | AT1 |
| **AT3** | `proxy.ts`（≠middleware.ts）でログイン必須化 | `clerkMiddleware`＋`createRouteMatcher`。**公開ルート以外を `auth.protect()`**。matcher は `_next`/静的を除外 | AT1 |
| **AT4** | `(auth)/sign-in` / `(auth)/sign-up` ルート | catch-all `[[...sign-in]]`/`[[...sign-up]]`。Google ログインは **ダッシュボードで有効化**【ユーザー操作】 | AT2 |
| **AT5** | `lib/auth/*` ヘルパー | `auth()`/`currentUser()` ラッパ・`isAdmin()`（`ADMIN_EMAILS` 照合）。既存 `admin/login` との整合方針を決める | AT1 |
| **AT6** | ヘッダー UI 最小配線 | `<UserButton/>`／未ログイン時 Sign in 導線。**B境界**（本格 UI は W8）＝最小限に留め B と握る | AT2 |
| **AT7** | 検証 | `npx tsc --noEmit`＋`npm run lint`、保護/公開が効くことの動作確認（dev はユーザー管理） | AT1–6 |

**進捗（2026-06-08・goaladv `clerk-auth`）**
- AT1〜AT4 **完了**（`npx tsc --noEmit` green）: `@clerk/nextjs@7.4.3` 導入・`ClerkProvider`・`src/proxy.ts`・`(auth)/sign-in|sign-up` ルート
- AT5 **保留＝他チーム調整待ち**: admin の Clerk 統合は **admin 領域担当の別チームと要相談**。着手分（lib/auth.ts ほか5ファイル）は `git restore` で巻き戻し済み・**既存 password 認証は無傷**
- AT6（ヘッダー UI）は B(UI) 境界のため同様に要調整 / AT7（検証）は AT1〜AT4 について実施済み（tsc green）

**公開ルート確定リスト（AT3 で適用・ログイン不要）**
- `/sign-in(.*)`・`/sign-up(.*)`
- `(legal)`: `/privacy`・`/terms`・`/tokushoho`（特商法は未ログイン閲覧が前提）
- SEO: `sitemap.xml`・`robots.txt`・`/llms.txt`・OGP・manifest
- `/api/ingest`（**CRON_SECRET で別保護**＝Clerk 保護から除外。[[commercial-data-constraints]]）
- `/api/webhooks(.*)`（Clerk/Stripe webhook）
- `/`（トップ）＝**要判断**: 72h 無料モデルなら「見せて登録誘導」で公開が自然 / 厳格運用なら保護

**ユーザー操作ブロッカー（MAIN では完結できない）**
- ⓐ Clerk CLI ログイン（`clerk auth login` はブラウザ）または publishable/secret キーの手動受領
- ⓑ ダッシュボードで **Google OAuth 有効化**
- ⓒ `.env.local` への実キー投入（本人）

**要確認（実装分岐に効く）**
1. トップ `/` を公開 or 保護どちらにするか（既定案＝公開・登録誘導）
2. env 配線は Clerk CLI（推奨・自動）か手動か
3. 既存 `admin/login` を Clerk に寄せるか当面共存か（既定案＝`ADMIN_EMAILS` 照合で Clerk に寄せる）

> 並行チーム配慮: `layout.tsx`(AT2) と ヘッダー(AT6) は B（ui-feature）と接触面。最小差分で入れ、本格 UI は W8 で B に委ねる。`globals.css` は触らない（B 正本）。
