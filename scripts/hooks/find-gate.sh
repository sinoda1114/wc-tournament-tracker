# push 前ゲート（グローバルの pre-push）の場所を求める。pre-push と setup-dev.sh が source する。
# git はこの名前のファイルをフックとして呼ばない。
#
# find_gate: 成功すれば 0 を返し、変数 gate にパスを入れる。設定を読めなければ変数 gate_error に理由を入れて 1 を返す。
# 場所: リポジトリの設定を除いた core.hooksPath（グローバル、無ければ system）の pre-push。どちらにも無ければ
# ~/.git-hooks/pre-push（/ai-review の導入先の既定）。--includes で include / includeIf をたどり、
# --type=path で ~ や ~user/ の展開を git に任せる。

# このフックの目印。ゲートとして見つけたファイルにこれがあれば、このフック自身（またはそのコピー）なので呼ばない。
WC_PREPUSH_CHAIN_MARKER="wc-tournament-tracker:pre-push-chain"

# read_hooks_path <--global|--system>: 値を stdout に出す。キーが無ければ空で 0、読めなければ 1。
read_hooks_path() {
  local out rc
  out="$(git config "$1" --includes --type=path --get core.hooksPath 2>&1)" && { printf '%s' "$out"; return 0; }
  rc=$?
  [ "$rc" -eq 1 ] && return 0   # キーが無い
  printf '%s' "$out"
  return 1
}

find_gate() {
  local dir
  gate=""; gate_error=""
  if ! dir="$(read_hooks_path --global)"; then
    gate_error="グローバルの git 設定を読めません（${dir}）。"; return 1
  fi
  if [ -z "$dir" ] && ! dir="$(read_hooks_path --system)"; then
    gate_error="system の git 設定を読めません（${dir}）。"; return 1
  fi
  if [ -z "$dir" ] && [ -z "${HOME:-}" ]; then
    gate_error="core.hooksPath も HOME も未設定です。"; return 1
  fi
  gate="${dir:-$HOME/.git-hooks}/pre-push"
  return 0
}
