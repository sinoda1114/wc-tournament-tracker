# WC2026 トーナメントトラッカー（MatchFav）— プロジェクト指示

ブランド: **MatchFav** / `matchfav.com`（旧名 "FootyFav"/"Pitchnotes"/"WC2026" 等は廃止）。FIFA 非公式サービス。

---

## マルチエージェント開発フロー（全エージェント標準・毎回の指示は不要）

> 正本: `notes/dev-workflow-multiagent.md`。
> **タスクを与えられたら、プロセスを指示されなくても以下を既定で実行する。**
> 人間はふつう「何を(WHAT)」だけ渡す。「やり方(HOW)」はこの手順に従う。

1. **専用作業空間を切る**: `git fetch origin` → `git worktree add ../wc-<topic> -b feat/<topic> origin/main`
   （リポ実体ディレクトリ `~/dev/wc-tournament-tracker` は **main 統合＋デプロイ専用**。ここで機能開発しない）
2. **実装する**（役割境界を守る。担当外ファイルは触らない。境界は memory `agent-registry`）
3. **2 段ゲート**: `/ai-review` → コミット → `/security-review`
4. **feature ブランチに push** → Vercel が**プレビューを自動発行** → その URL で自分で動作確認
5. **PR を作成**（base = `main`、本文に `Refs #N` または `Closes #N`）
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

## タスク管理（Issue / Project 正本）

> 正本: `notes/task-management-issue-workflow.md`。
> **現役タスクは GitHub Issue / Project「MatchFav Tasks」#2 が正本**。
> `notes/task-ledger.md` は 2026-06-17 に凍結済みの過去ログ・方針アーカイブであり、現役タスクの正本ではない。

### 基本ルール

- 新規タスクは `T-116` 以降で GitHub Issue として起票する。
- 状態は Project の Status 列（Inbox / Ready / Waiting / Doing / PR / Prod Check / Done）を正とする。
- `status:*` ラベルは使わない。種別は `type:*` ラベルを使う。
- 手書き `task-index.md` は作らない。必要なら Issue から自動生成する。
- `notes/agent-sync.md` は段階引退中の補助メモ。マージ依頼は PR、経緯や完了報告は Issue コメントへ寄せる。

### 発見駆動の回収事項

タスクから始まった作業でなくても、作業・調査・レビュー・本番確認中に新しい回収事項、不具合、追加作業、判断待ちを見つけた場合は放置しない。

- 既存タスクの範囲内なら、既存 Issue または PR コメントに追記する。
- 別作業として追跡すべきなら、新規 Issue を起票して Project に入れる。
- 篠田判断、外部情報、データ待ちなら Project Status を `Waiting` にする。
- main マージ済みで本番/篠田確認だけ残るなら `Prod Check` にする。
- 作業ではなく恒久ルールや方針なら `notes/` に残してよいが、タスクリストでは「方針メモ / 運用注意」として扱う。

この運用は、篠田の明示タスクだけでなく、番人・子分・弟子・SUB が発見した「作業の回収」にも適用する。

### 子分・番人向けの最短ルール

- 方針は **確実性を最優先しつつ、手間を増やしすぎない**。全部をIssue化しない。
- 子分/弟子/SUB は、完了報告や追加発見をユーザー経由で Codex に運ばせない。
- 既存 Issue がある作業は、既存 Issue または PR コメントへ直接記録する。
- 既存 Issue が無いが追跡すべき作業は、新規 Issue を作って Project に載せる。採番に迷う場合だけ Codex に起票依頼する。
- 完了済みでProject履歴に残したいだけの作業は、closed Issue として記録する。
- 軽微で追跡不要な修正は、PR本文とPRコメントに残せばよい。
- `notes/agent-sync.md` への追記は原則しない。使った場合も一時メモ扱いで、正本は Issue / PR コメントへ転記する。

Issue化の目安:

- Issue化する: 状態管理が必要、後で確認が必要、担当を渡す、ユーザー判断待ち、本番確認待ち、再発防止として残す。
- PRコメントで済ませる: そのPR内で完結する軽微修正、実装中に見つけて同時に直した小さい不具合、後追い不要な説明。
- closed Issueにする: 追跡Issueなしで完了したが、Project履歴・incident履歴として残したいもの。

---

## 参照

- **タスク管理の正本**: GitHub Issue / Project「MatchFav Tasks」#2。詳細は `notes/task-management-issue-workflow.md`。
- **過去ログ・方針アーカイブ**: `notes/task-ledger.md`（現役タスク正本ではない）。
- **運用ルール詳細**: `notes/dev-workflow-multiagent.md`
- **ドメイン接続/本番 Clerk 手順**: `notes/runbook-domain-clerk-prod.md`（#22 / #25）
- **デプロイ運用の状態**: memory `vercel-deploy-ops`

## dev 規律

- dev サーバ起動中に `.next` を削除したり `npm run build` を実行しない（壊れる）。dev は 1 つ。
- AI 検証は `tsc` / `eslint` / `test` で行う（手動確認をユーザーに丸投げしない）。
- `.env.local` は触らない・中身を出力しない（本番 env は Vercel ダッシュボードが正本）。
