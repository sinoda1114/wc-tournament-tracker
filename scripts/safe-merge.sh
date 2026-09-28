#!/usr/bin/env bash
# CI（required check）が緑のときだけ PR を squash マージする番人用ラッパー。
# main の保護設定でも同じチェックが必須になっている。GitHub 側は加えて「会話の解決」も必須にしているので、
# 未解決のレビューのスレッドがあると、最後の gh pr merge が理由を出して止まる。
#
# 使い方:  scripts/safe-merge.sh <PR番号>     例: scripts/safe-merge.sh 46
set -euo pipefail

# required 扱いするチェック。main の保護設定の required status checks と同じ名前にする
# （gh api repos/sinoda1114/wc-tournament-tracker/branches/main/protection -q .required_status_checks.contexts）。
REQUIRED_CHECK="ci / build"

pr="${1:-}"
if ! [[ "$pr" =~ ^[0-9]+$ ]]; then
  echo "usage: scripts/safe-merge.sh <PR番号>" >&2
  exit 1
fi

# PR が OPEN か確認。
state=$(gh pr view "$pr" --json state --jq '.state' 2>/dev/null || true)
if [ "$state" != "OPEN" ]; then
  echo "⛔ PR #${pr} は OPEN ではありません（state=${state:-不明}）。" >&2
  exit 1
fi

# required check の bucket（pass/fail/pending/skipping/cancel）を取得。
bucket=$(gh pr checks "$pr" --json name,bucket \
  --jq ".[] | select(.name == \"${REQUIRED_CHECK}\") | .bucket" 2>/dev/null || true)

if [ -z "$bucket" ]; then
  echo "⛔ required check「${REQUIRED_CHECK}」が見つかりません。CI が走っているか確認してください。" >&2
  exit 1
fi
if [ "$bucket" != "pass" ]; then
  echo "⛔ CI「${REQUIRED_CHECK}」が pass ではありません（現在: ${bucket}）。緑になってから再実行してください。" >&2
  exit 1
fi

echo "✓ CI「${REQUIRED_CHECK}」= pass。PR #${pr} を squash マージします。"
gh pr merge "$pr" --squash
