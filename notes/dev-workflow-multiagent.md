# マルチエージェント開発の運用規律（正本）

> 目的: 複数エージェント/セッションが**同じ作業コピー・同じ main を同時に書く**ことで起きる
> 衝突（未コミット変更の巻き込み・main 直コミット競合・本番デプロイの二重化）を物理的に無くす。
> このファイルが運用の正本。全エージェントはここに従う。

## 1. 作業空間の分離：1エージェント＝1 worktree＝1ブランチ

- リポジトリの**実体ディレクトリ `~/dev/wc-tournament-tracker` は「main 統合＋デプロイ専用」**。
  ここで feature 開発をしない。番人（人間 or デプロイ担当エージェント）だけが触る。
- 機能開発は **`git worktree` で各自の作業空間**を切り、**専用 feature ブランチ**で行う。
  `.git` は共有されるが**作業ファイルは完全分離**＝未コミット衝突が原理的に起きない。

```bash
# main 統合 dir（このリポ本体）で worktree を作る
git worktree add ../wc-events    feat/match-events     # 例: 試合イベント(#20)
git worktree add ../wc-billing   feat/stripe-billing   # 例: 課金(#14)
# 各 Claude セッションを各 dir で開いて作業する

# 一覧 / 後片付け
git worktree list
git worktree remove ../wc-events      # マージ後に撤去
```

- 命名規則: `feat/<topic>` `fix/<topic>` `chore/<topic>`。worktree dir は `../wc-<topic>`。
- **同じファイルを2つの worktree で同時編集しない**（役割境界＝memory `agent-registry` を踏襲）。

## 2. main は「PR マージ専用」（直コミット禁止）

- **誰も main に直接 commit / push しない**。例外なし。
- 機能は feature ブランチ → **PR → マージ**。
- マージ前に **2 段ゲート**（`/ai-review` → コミット → `/security-review`）を通す。
- コンフリクトは feature 側で `git merge origin/main`（or rebase）して解消してから PR を出す。

## 3. デプロイは「git 駆動・単一オーナー」（手動 CLI 禁止）

- **`main にマージ ＝ 本番(Production)自動デプロイ`** に一本化（Vercel Git 連携）。
- **手動 `vercel --prod` は原則禁止**（本番状態の二重化を防ぐ）。緊急時のみ番人が実施し、必ず記録。
- **PR ごとに自動でプレビュー URL が発行**される（Vercel Pro）。
  → **機能別の動作確認はプレビュー URL で**。本番は main だけ。
- 環境変数は Vercel ダッシュボードが正本（`.env.local` はローカル dev 用、リポに出さない）。

## 4. 役割境界（memory `agent-registry` と整合）

| 領域 | 担当の目安 |
|---|---|
| UI/配色/予想/投票/検索/結果取込 | ui-feature |
| 認証(Clerk)/課金(Stripe)/管理者判定 | auth-billing |
| 出場国/スカッド/データ取得 | data-squad |
| 法務/SEO/インフラ(vercel/next.config/CI) | legal-seo-infra |
| 整合監督/レビュー（実装しない） | reviewer |

- 担当外ファイルは触らない。越境が要るときは PR 説明に明記し reviewer 確認。

## 5. 台帳

- タスクの正本は `notes/task-ledger.md`。着手/完了はそこへ（完了は取り消し線＋SHA）。
- セッション内の TaskList は揮発する。毎セッション冒頭で台帳を読む。

---

## 移行（cutover）手順 — 進行中作業を壊さない順番

1. **凍結宣言**: 「これ以降 main へ直コミットしない」を全エージェントで合意（この文書を共有）。
2. **進行中の未コミットを退避**: 各エージェントは自分の変更を feature ブランチへ commit/PR 化。
   - main 統合 dir に他人の未コミットが残っていないことを `git status` で確認。
3. **worktree へ移動**: 以降の機能作業は §1 の worktree で。各セッションを各 dir に割り当て。
4. **git 自動デプロイを実証**: 最初の PR で「プレビュー発行 → マージで本番自動デプロイ」が
   動くことを確認。動かなければ Vercel の Git 設定（Production Branch / Ignored Build Step /
   接続状態）を点検して直す。**直るまで本番は番人が手動で最新 main を出す**（暫定のみ）。
5. **手動デプロイ卒業**: 自動デプロイ実証後は §3 を厳守。
