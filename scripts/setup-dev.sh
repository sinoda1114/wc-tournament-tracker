#!/usr/bin/env bash
# 開発環境の初期セットアップ（クローン後・本体で 1 回だけ実行）。
# pre-commit hook を有効化し、本体ディレクトリでの誤コミットを物理的に防ぐ。
set -euo pipefail

# 本体（git-dir == common-dir）からのみ実行を許可する。
# worktree から実行すると core.hooksPath に一時パスが設定され、削除後に hook が壊れるため。
resolve() { cd "$1" 2>/dev/null && pwd -P; }
git_dir=$(resolve "$(git rev-parse --git-dir)") || git_dir=""
common_dir=$(resolve "$(git rev-parse --git-common-dir)") || common_dir=""
if [ -z "$common_dir" ] || [ "$git_dir" != "$common_dir" ]; then
  echo "⛔ setup-dev.sh は本体リポジトリで実行してください（worktree からは不可）。" >&2
  exit 1
fi

root=$(dirname "$common_dir")   # <repo>/.git の親 = 本体 root
git config core.hooksPath "${root}/scripts/hooks"

echo "✓ core.hooksPath = ${root}/scripts/hooks"
echo "  本体での commit は pre-commit で拒否されます（worktree は許可）。"
echo "  worktree を切るときは: scripts/new-worktree.sh <topic>"
