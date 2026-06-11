# 実行計画: #19 公開ページのロケール別URL化（B-lite）

> 夜間自走用の設計図。実装はこのプラン通りに進め、逸脱が必要なら一旦止めて記録する。
> 作成: 2026-06-11 / ブランチ: `feat/i18n-public-locale-routing` / worktree: `~/dev/wc-i18n-routing`

## 0. 背景と最重要前提（スコープの根拠）

- 本文UIの5言語化（ja/en/es/pt/zh）は**既に完了済み**。残るのは metadata/OGP の多言語化（#19 の残作業）。
- **公開（未ログインで到達できる）ページは実質3つだけ**: `/`（トップ）・`/terms`・`/privacy`。
  - `proxy.ts` の `isPublicRoute` がこの3つ＋sign-in/up＋api のみ公開。
  - `/groups` `/teams` `/matches/*` `/prediction` `/favorites` は `auth.protect()` でログイン必須
    → **クローラー/SNS bot は到達できず、何語にしてもインデックスされない**。
- 従って **全サイトの `[locale]` 化（B-full）は大半が無駄**。価値が出るのは公開3ページのみ。
- 本計画は **公開ページだけをロケール別URL化（B-lite）** する。内部ページは現状の Cookie 方式のまま不変。

## 1. ゴール（完了条件）

> **確定スコープ（2026-06-11 ユーザー確認済み）**: B-lite / **トップのみ** / **OGPは言語中立1枚**。
> → 法務ページ（/en/terms 等）は**作らない**。対象は**トップページのロケール別URLのみ**。

- **トップページ**に **ロケール別URL** を用意する（既存URLは温存）:
  - ja（既定）: `/`（**プレフィックス無し・現状維持**）
  - en/es/pt/zh: `/en` `/es` `/pt` `/zh`
- トップが **ロケールに応じた `<title>` / `<description>` / OGP文言** を返す。
- トップに **hreflang 相互リンク**（alternates.languages）＋ `x-default`（=ja `/`）を出す。
- `sitemap.xml` にトップのロケール別URL＋hreflang を載せる。
- `<html lang>` がロケール別URLでも正しい（`/en` → `lang="en"`）。
- OGP画像は**言語中立の既存1枚を全言語で共有**（og:title/description だけ多言語化）。
- 検証: `tsc` 0 / `eslint` 0 errors / `vitest` 全green（+ 追加テスト）。可能なら `next build` で経路衝突なしを確認。

## 2. 設計判断（確定事項。※未確定はユーザー確認待ち＝§7）

- **既定ロケール ja はプレフィックス無し**。→ 既存URL・既存被リンク・ブックマークを壊さない。
- 内部（ログイン必須）ページは**触らない**。`/en/groups` 等は作らない（404でよい）。
- ロケール解決の優先順位を **URLプレフィックス（middlewareがヘッダ化）→ Cookie → 既定** に拡張。
  - ロケール別URLを踏むと、その言語を Cookie にも焼く（以降の内部ページ遷移も同じ言語で継続）。
- **OGP画像は言語中立の1枚を共有**（og:title/description だけ多言語化）。
  画像内テキストの多言語生成はやらない（コスパ低・別途判断）。

## 3. 変更ファイル一覧と内容

### 3.1 メッセージ辞書（5言語）
`src/lib/i18n/messages/{ja,en,es,pt,zh}.ts`
- 新ネームスペース `meta` を追加。**トップのみ**の `title` / `description`:
  ```
  meta: {
    home: { title: '…', description: '…' },
  }
  ```
- `tests/unit/i18n.test.ts` のキー網羅テストが自動で5言語の整合を担保（RED→GREENで進める）。
- 型 `Dictionary`（`dictionary.ts`）にも `meta` を反映。

### 3.2 hreflang/URL ヘルパー（新規）
`src/lib/i18n/alternates.ts`
- ページキー `'home'`（トップのみ）と現在ロケールを受け取り、
  `{ canonical: string, languages: Record<string,string> }` を返す純関数。
- URL規則: ja は `/`、他は `/<loc>`。`x-default` は ja（`/`）。
  （将来ページを増やすときに備え、path 引数で一般化しておくと拡張が楽）
- env の絶対URL（`getSiteUrl()`）を基準に絶対URLを返す（metadata/sitemap 双方で再利用）。
- 単体テスト `tests/unit/i18n-alternates.test.ts` を追加（各ロケール×各ページのURL生成）。

### 3.3 ロケール解決の拡張
`src/lib/i18n/server.ts`
- `resolveLocale()` を **ヘッダ `x-wc-locale` → Cookie → 既定** の順に変更。
  - `headers()` を読む（RSC可）。`isLocale()` で検証。
- 単体テスト追加（`tests/unit/i18n-resolve.test.ts` 相当。headers/cookies をモック）。

### 3.4 ミドルウェア
`src/proxy.ts`
- 先頭セグメントが `en|es|pt|zh` のとき:
  - リクエストヘッダ `x-wc-locale=<loc>` を付与（root layout / resolveLocale が読む）。
  - レスポンスに Cookie `wc_locale=<loc>`（max-age 1年・path=/・samesite=lax）を焼く。
  - これら（`/en` `/en/terms` 等）は**公開ルート扱い**（Clerk auth をかけない）。
- それ以外は現状通り（公開判定→`auth.protect()`）。
- 注意: `clerkMiddleware` のコールバック内で `NextResponse.next({ request: { headers }})` を返す形に。
  Clerk のレスポンス改変と両立させる（順序: ロケール処理→公開判定→protect）。

### 3.5 ロケール別ルート（新規・**トップのみ**）
- `src/app/[locale]/page.tsx`（トップ）**のみ**。法務の `[locale]` ルートは作らない。
- これに:
  - `export const dynamicParams = false;`
  - `export function generateStaticParams() { return [{locale:'en'},{locale:'es'},{locale:'pt'},{locale:'zh'}]; }`
  - `generateMetadata({params})`: `meta` 辞書＋ `alternates`（canonical/languages, §3.2）＋ openGraph.locale。
  - 本体は §3.6 の共有ビューを `locale` 付きで描画。
- **静的経路優先**により `/groups` 等（静的セグメント）は `[locale]` に吸われない。
  ロケール以外の先頭セグメント（例 `/foo`）は `dynamicParams=false` で 404。
  → `next build` で経路衝突が無いことを必ず確認。

### 3.6 ページ本体の共有化（DRY）
- トップ: 現 `src/app/page.tsx` の本体を `src/components/HomeView.tsx`（`locale`/`dict` を受け取る）へ抽出。
  root `page.tsx` と `[locale]/page.tsx` の両方が `HomeView` を描画。
- **法務本文の抽出は不要**（[locale] 法務ルートを作らないため）。

### 3.7 既定（ja）トップの metadata 補強
- `src/app/page.tsx` に `generateMetadata` を追加し、
  ja の title/description＋ **hreflang（全ロケール＋x-default）** を出す。
- 法務ページ（`(legal)/terms` `(legal)/privacy`）は**今回触らない**（日本語のまま）。
- `src/app/layout.tsx` の静的 `metadata`:
  - サイト共通の既定（template, siteName, manifest 等）は維持。
  - ページ個別 title/description は各 `generateMetadata` 側に委譲（layout の default は据置でよい）。
  - `alternates.canonical:'/'` は layout から外し、各ページの generateMetadata で正しい canonical を出す
    （layout に残すと全ページ canonical=/ になり得るため要確認）。

### 3.8 言語スイッチャー
`src/components/LanguageSwitcher.tsx`
- 現在パス（`usePathname()`）が公開ページなら、選択ロケールの**URLへ遷移**（`router.push`）＋Cookie保存。
  - パス→公開ページキーの対応表を持ち、ターゲットURLを §3.2 ヘルパー（client用に小関数化）で生成。
- 公開ページでないなら**現状通り** Cookie保存＋`router.refresh()`（URL変種が無いため）。

### 3.9 sitemap
`src/app/sitemap.ts`
- **トップ**エントリに `alternates.languages`（hreflang）を付与し、ロケール別URL（/en 等）を列挙。
- 法務・内部ページのエントリは現状維持（スコープ外）。

## 4. ビルド順序（夜間自走の手順）

1. `meta` 辞書を5言語へ追加 → `dictionary.ts` 型反映 → `vitest`（キー網羅 RED→GREEN）。
2. `alternates.ts` ＋単体テスト（GREEN）。
3. `resolveLocale()` 改修＋単体テスト（GREEN）。
4. `proxy.ts` 改修（ヘッダ＋Cookie＋公開判定）。
5. 本体共有化（`HomeView` ＋法務 body 抽出）。root ページを共有版へ差し替え。
6. `src/app/[locale]/{page,terms,privacy}` 追加（generateStaticParams/Metadata/hreflang）。
7. 既定公開ページに `generateMetadata`（hreflang）追加・layout の canonical 整理。
8. `LanguageSwitcher` 改修。
9. `sitemap.ts` に hreflang。
10. 検証: `npx tsc --noEmit` / `npx eslint .` / `npm run test`。可能なら `npm run build` で経路確認。
11. コミット（段階ごと）→ push → PR（base=main）。**マージは番人**。

## 5. 検証チェックリスト

- [ ] `tsc` 0 / `eslint` 0 errors / `vitest` 全green（新規テスト含む）
- [ ] `/en` `/es` `/pt` `/zh` がトップを各言語で表示・`<html lang>` 一致
- [ ] トップの `<title>`/`<meta description>`/og:title がロケール一致
- [ ] hreflang が全ロケール＋x-default を相互に指す（view-source 確認）
- [ ] `/groups` 等の内部ページが従来通り（ログイン要求・挙動不変）
- [ ] `/foo`（未知の先頭セグメント）が 404・`/en/terms` も 404（法務はスコープ外）
- [ ] `sitemap.xml` にトップのロケール別URL＋alternates
- [ ] 既存URL（`/` `/groups` 等）が無リダイレクトで従来通り

## 6. リスクとロールバック

- リスク: `[locale]` が意図せぬパスを捕捉 → `dynamicParams=false`＋静的優先＋`next build`確認で抑止。
- リスク: middleware ヘッダ付与と Clerk の併用順序 → 内部ページの protect が効くことをテスト。
- リスク: ja `/` と `/en` の重複コンテンツ → canonical＋hreflang を正しく出して回避。
- ロールバック: 本ブランチを**マージしないだけ**で本番影響ゼロ。
  個別取消は `src/app/[locale]/` 削除＋ proxy/server/switcher/sitemap/metadata/辞書 を revert。

## 7. 確定事項（2026-06-11 ユーザー確認済み・ブロッカー解消）

1. **スコープ = B-lite（公開ページのみ）**。B-full は不採用。
2. **対象 = トップのみ**。法務ページのロケール別URLは作らない。
3. **OGP = 言語中立の既存1枚を全言語共有**。画像内テキストの多言語化はしない。

→ ブロッカーなし。本計画 §3〜§4（トップのみスコープ）を夜間に自走で完遂してよい。
