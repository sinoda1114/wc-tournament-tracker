# WC2026 トーナメントトラッカー（MatchFav）— プロジェクト指示

ブランド: **MatchFav** / `matchfav.com`（旧名 "FootyFav"/"Pitchnotes"/"WC2026" 等は廃止）。FIFA 非公式サービス。

---

## マルチエージェント開発フロー（全エージェント標準・毎回の指示は不要）

> 正本: `notes/dev-workflow-multiagent.md`。
> **タスクを与えられたら、プロセスを指示されなくても以下を既定で実行する。**
> 人間はふつう「何を(WHAT)」だけ渡す。「やり方(HOW)」はこの手順に従う。

1. **専用作業空間を切る**: `git worktree add ../wc-<topic> feat/<topic>`
   （リポ実体ディレクトリ `~/dev/wc-tournament-tracker` は **main 統合＋デプロイ専用**。ここで機能開発しない）
2. **実装する**（役割境界を守る。担当外ファイルは触らない。境界は memory `agent-registry`）
3. **2 段ゲート**: `/ai-review` → コミット → `/security-review`
4. **feature ブランチに push** → Vercel が**プレビューを自動発行** → その URL で自分で動作確認
5. **PR を作成**（base = `main`）
6. **マージは依頼制**: 完成したら「PR #N できました、マージお願いします」と
   **デプロイ担当（番人）** に渡す。自分ではマージしない。

### 禁止事項（番人＝デプロイ担当の専権領域）

- **`main` へ直接 commit / push しない**（必ず PR 経由）
- **PR を自分でマージしない**（main マージ＝本番デプロイ。番人が実行）
- **Vercel 設定・環境変数・手動 `vercel --prod` に触らない**

### デプロイ（git 駆動・自動）

- feature push → **Preview 自動デプロイ**（PR ごとに確認 URL）
- `main` マージ → **Production 自動デプロイ**（手動デプロイは原則禁止）
- 本番: https://wc-tournament-tracker.vercel.app （独自ドメイン `matchfav.com` 接続は #22）
- 絶対 URL は env `NEXT_PUBLIC_SITE_URL`（=`https://matchfav.com`）経由。ハードコード禁止。

---

## 参照

- **タスク台帳（WHATの単一正本）**: `notes/task-ledger.md`（着手/完了をここへ。完了は取り消し線＋SHA）。
  ⚠️ **セッション/ハーネスの TaskList 表示は揮発・ドリフトするので信用しない**。
  タスクの内容・番号・状態は**必ずこのファイルを読んで**判断する（一覧と食い違ったら台帳が正）。
- **運用ルール詳細**: `notes/dev-workflow-multiagent.md`
- **ドメイン接続/本番 Clerk 手順**: `notes/runbook-domain-clerk-prod.md`（#22 / #25）
- **デプロイ運用の状態**: memory `vercel-deploy-ops`

## dev 規律

- dev サーバ起動中に `.next` を削除したり `npm run build` を実行しない（壊れる）。dev は 1 つ。
- AI 検証は `tsc` / `eslint` / `test` で行う（手動確認をユーザーに丸投げしない）。
- `.env.local` は触らない・中身を出力しない（本番 env は Vercel ダッシュボードが正本）。
