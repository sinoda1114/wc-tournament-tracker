#!/usr/bin/env bash
# 最新 origin/main を起点に worktree を安全に作成するラッパー。
# 古い本体 HEAD から枝を切る「先祖返り」事故を物理的に防ぐ（T-89 の再発防止）。
#
# 使い方:  scripts/new-worktree.sh <topic>     例: scripts/new-worktree.sh venue-flag
#   → ../wc-<topic> に feat/<topic> ブランチの worktree を origin/main 起点で作成し、
#     土台の遅れが 0 であることを検証し、node_modules / .env.local をシムリンクする。
set -euo pipefail

topic="${1:-}"
if [ -z "$topic" ]; then
  echo "usage: scripts/new-worktree.sh <topic>   (例: venue-flag)" >&2
  exit 1
fi

# 入力バリデーション: 英数字・ハイフン・アンダースコアのみ（パストラバーサル/空白/メタ文字を早期拒否）。
if ! [[ "$topic" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "⛔ topic は英数字・ハイフン・アンダースコアのみ使用可能です: ${topic}" >&2
  exit 1
fi

# 本体 root（common-dir = <repo>/.git の親）と、その隣に worktree を作る。
common_dir=$(cd "$(git rev-parse --git-common-dir)" && pwd -P)
repo_root=$(dirname "$common_dir")
branch="feat/${topic}"
wt_path="$(dirname "$repo_root")/wc-${topic}"

if git show-ref --verify --quiet "refs/heads/${branch}"; then
  echo "⛔ ブランチ ${branch} は既に存在します。別の topic 名にするか既存 worktree を使ってください。" >&2
  exit 1
fi
if [ -e "$wt_path" ]; then
  echo "⛔ パス ${wt_path} は既に存在します。" >&2
  exit 1
fi

echo "▶ git fetch origin ..."
git fetch origin --quiet

echo "▶ origin/main 起点で worktree 作成: ${wt_path}  (${branch})"
git worktree add "$wt_path" -b "$branch" origin/main

# 以降で失敗したら、作りかけの worktree/branch を残さず掃除して中断する。
trap 'echo "⛔ 作成中にエラー。worktree/branch を破棄します。" >&2; git worktree remove --force "$wt_path" 2>/dev/null; git branch -D "$branch" 2>/dev/null; exit 1' ERR

# 土台の遅れを検証（0 以外なら異常 → 破棄して中断）。
behind=$(git -C "$wt_path" rev-list --count HEAD..origin/main)
if [ "$behind" != "0" ]; then
  echo "⛔ 土台が origin/main より ${behind} コミット遅れています。worktree を破棄します。" >&2
  git worktree remove --force "$wt_path"
  git branch -D "$branch" 2>/dev/null || true
  exit 1
fi
echo "✓ 土台は origin/main 最新（遅れ 0）"

# 検証成功。以降の軽微な失敗では worktree を破棄しない。
trap - ERR

# dev 確認用に node_modules / .env.local をシムリンク（実体は本体側）。
ln -sf "${repo_root}/node_modules" "${wt_path}/node_modules"
if [ -e "${repo_root}/.env.local" ]; then
  ln -sf "${repo_root}/.env.local" "${wt_path}/.env.local"
fi

cat <<MSG
✓ 完了: ${wt_path}
  ブランチ: ${branch}（origin/main 起点・遅れ 0）
  dev 起動: cd ${wt_path} && npm run dev -- --webpack
            （node_modules はシムリンクのため Turbopack 不可・必ず --webpack）
MSG
