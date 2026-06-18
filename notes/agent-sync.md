# エージェント同期プロトコル（移行後アーカイブ）

> ⚠️ **2026-06-18 以降、このファイルは現役タスク・状態・完了報告の正本ではありません。**
>
> 現役タスクの正本は GitHub Issue / Project **MatchFav Tasks** #2 です。
> マージ依頼は PR、経緯・完了報告・本番確認は Issue / PR コメントへ残してください。
> 作業中に発見した回収事項・追加作業・判断待ちは、既存 Issue / PR コメントへ追記するか、新規 Issue 化してください。

## 現行ルール

1. **GitHub Issue / Project「MatchFav Tasks」#2** = 現役タスク・状態の正本。
2. **GitHub PR** = 実装差分・マージ待ちの正本。
3. **Issue / PR コメント** = 経緯・完了報告・本番確認の正本。
4. **本ファイル** = 過去の受け渡しボードのアーカイブ。新規追記は原則しない。

## 子分・弟子・SUB 向け

- 方針は **確実性を最優先しつつ、手間を増やしすぎない**。全部をIssue化しない。
- 完了報告や追加発見を、ユーザー経由で Codex に運ばせない。
- 既存 Issue がある作業は、既存 Issue または PR コメントへ直接記録する。
- 既存 Issue が無いが追跡すべき作業は、新規 Issue を作って Project に載せる。採番に迷う場合だけ Codex に起票依頼する。
- 完了済みでProject履歴に残したいだけの作業は、closed Issue として記録する。
- 軽微で追跡不要な修正は、PR本文とPRコメントに残せばよい。

Issue化するのは、状態管理・担当引き継ぎ・後日確認・ユーザー判断・本番確認・再発防止が必要なもの。
そのPR内で完結する軽微修正は、PR本文/PRコメントだけでよい。

## 番人向け

- 呼ばれたら `gh pr list --state open` と GitHub Project を確認する。
- PRをマージしたら、関連 Issue / PR コメントに本番反映・確認結果を残す。
- Production確認待ちが残る場合は Project を `Prod Check` に置く。
- 完了したら Issue を close し、Project を `Done` にする。

## 過去メモ

旧「受け渡しボード」は、Issue/Project移行前の履歴としてのみ扱います。必要な履歴は `notes/task-ledger.md`、GitHub Issue、PR、commit履歴を参照してください。
