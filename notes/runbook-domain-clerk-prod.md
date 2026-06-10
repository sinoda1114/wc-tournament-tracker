# 朝用ランブック: matchfav.com 接続 → Clerk 本番化（#22残り＋#25）

> 所要 30〜45分。上から順に。各ステップの「確認」が通ってから次へ。
> 前提: matchfav.com は Cloudflare 取得済み・Email Routing 稼働済み（6/11）。

## Step 1. Vercel にドメインを追加（5分）

1. Vercel ダッシュボード → 本プロジェクト → Settings → **Domains** → `matchfav.com` を追加（`www.matchfav.com` も追加し、apex へのリダイレクトに設定）
2. Vercel が要求する DNS レコードが表示される（通常 A `76.76.21.21` と CNAME `cname.vercel-dns.com`）

## Step 2. Cloudflare に DNS レコード追加（5分）

1. Cloudflare ダッシュボード → matchfav.com → **DNS** → Records
2. Vercel の指示どおり追加:
   - `A` / name `@` / Vercel 指定の IP
   - `CNAME` / name `www` / `cname.vercel-dns.com`
3. **⚠️ 最重要: 両レコードとも「プロキシ状態」を DNSのみ（グレー雲）にする**。オレンジ雲（プロキシ）だと Vercel の証明書発行と Clerk の検証が失敗する
4. ※ Email Routing の MX/TXT レコードには触らない

**確認**: Vercel の Domains 画面が両ドメインとも `Valid Configuration` になる → https://matchfav.com がサイトを返す（証明書発行に数分かかることあり）

## Step 3. Clerk 本番インスタンス（15分）

1. Clerk ダッシュボード → 現アプリ → 上部の環境スイッチで **Create production instance**（dev インスタンスから複製）
2. ドメインに `matchfav.com` を設定 → Clerk が指示する **CNAME レコード群**（`clerk.matchfav.com`・`accounts.matchfav.com` 等）を Cloudflare に追加。**これもすべてグレー雲（DNSのみ）**
3. **SSO**: Google を有効化。本番は Clerk の共有クレデンシャル不可なので、Google Cloud Console で OAuth クライアントを作成し Client ID/Secret を Clerk に貼る（Clerk の画面にリダイレクト URI が表示される）
4. 本番 API キー（`pk_live_…` / `sk_live_…`）を控える

**確認**: Clerk の Domains 画面が全レコード Verified になる

## Step 4. Vercel 本番環境変数（10分）

Settings → Environment Variables（**Production**）に設定:

| キー | 値 |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://matchfav.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…`（Step 3） |
| `CLERK_SECRET_KEY` | `sk_live_…`（Step 3） |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `ADMIN_EMAILS` | オーナーのメール |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | 本番DB（現状の Turso をそのまま使うなら同値） |
| `CRON_SECRET` | ランダム値（`openssl rand -hex 32`。ローカルと別でよい） |
| `WEATHER_API_KEY` | WeatherAPI.com のキー |
| `INGEST_WINDOW_DAYS` | `3`（初回だけ `30` でバックフィル→戻す） |

設定後 **Redeploy**（env はデプロイ時に焼き込まれるため必須）。

## Step 5. 動作確認（5分）

1. https://matchfav.com → Google ログイン（本番 Clerk。「Development mode」バッジが**出ない**こと）
2. オーナーで `/admin` が開ける・一般想定では開けない（別ブラウザ/シークレット）
3. `curl -s -H "Authorization: Bearer <本番CRON_SECRET>" https://matchfav.com/api/ingest` → `{"ok":true,…}`
4. `https://matchfav.com/llms.txt`・`/sitemap.xml`・`/terms` が表示される
5. Vercel Cron（vercel.json）が有効なら Logs で毎時実行を確認

## つまずきポイント
- **オレンジ雲にしてしまう** → 証明書/検証が通らない。全部グレー雲
- Clerk 本番は **Google OAuth の自前クレデンシャル必須**（dev と違う）
- env 変更後に Redeploy を忘れる
- ローカル `.env.local` は触らない（dev は dev キーのまま）

## 終わったら
- 台帳 #22/#25 を完了に（取り消し線＋日付）
- 残る大物は **#14 価格決定** →『【価格未定】』置換・特商法 noindex 解除・#26 予告バナー
