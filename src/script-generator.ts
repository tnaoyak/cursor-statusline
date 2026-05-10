import { SetupConfig } from "./types.js";

function shellQuote(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

export function buildStatuslineScript(config: SetupConfig): string {
  const items = config.items.map((item) => `  ${shellQuote(item)}`).join("\n");

  return `#!/usr/bin/env bash
set -euo pipefail

ITEMS=(
${items}
)
SEPARATOR=$'\\033[2m | \\033[0m'

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

PAYLOAD="$(cat)"

json_value() {
  local query="$1"
  printf '%s' "$PAYLOAD" | jq -r "$query // empty" 2>/dev/null
}

format_k() {
  local raw="$1"
  if [ -z "$raw" ]; then
    return
  fi
  if ! [[ "$raw" =~ ^-?[0-9]+([.][0-9]+)?$ ]]; then
    printf '%s' "$raw"
    return
  fi
  awk -v n="$raw" 'BEGIN {
    abs = (n < 0 ? -n : n);
    if (abs >= 1000) {
      k = n / 1000;
      rounded = int((k * 10) + (k >= 0 ? 0.5 : -0.5)) / 10;
      if (rounded == 0) rounded = 0;
      if (rounded == int(rounded)) {
        printf "%.0fk", rounded;
      } else {
        printf "%.1fk", rounded;
      }
    } else {
      v = int(n + (n >= 0 ? 0.5 : -0.5));
      if (v == 0) v = 0;
      printf "%d", v;
    }
  }'
}

home_shorten() {
  local value="$1"
  if [ -z "$value" ]; then
    return
  fi
  if [[ "$value" == "$HOME"* ]]; then
    printf '~%s' "\${value#"$HOME"}"
  else
    printf '%s' "$value"
  fi
}

git_branch() {
  git rev-parse --git-dir >/dev/null 2>&1 || return
  git branch --show-current 2>/dev/null || true
}

project_name() {
  local repo_root
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  if [ -n "$repo_root" ]; then
    basename "$repo_root"
    return
  fi
  local cwd
  cwd="$(json_value '.workspace.current_dir // .cwd')"
  if [ -n "$cwd" ]; then
    basename "$cwd"
  fi
}

git_diff_summary() {
  git rev-parse --git-dir >/dev/null 2>&1 || return
  local stat
  stat="$(git diff --shortstat HEAD 2>/dev/null || true)"
  if [ -n "$stat" ]; then
    local inserts
    inserts="$(printf '%s' "$stat" | sed -nE 's/.* ([0-9]+) insertion.*/\\1/p')"
    local deletes
    deletes="$(printf '%s' "$stat" | sed -nE 's/.* ([0-9]+) deletion.*/\\1/p')"
    inserts="\${inserts:-0}"
    deletes="\${deletes:-0}"
    printf '+%s -%s' "$inserts" "$deletes"
  fi
}

color_code_for_item() {
  case "$1" in
    model|model-with-params|cli-version) printf '36' ;;
    current-dir|project-name|git-branch|worktree-name|git-diff) printf '35' ;;
    context-used|context-remaining|context-window-size|tokens-used|tokens-in|tokens-out) printf '32' ;;
    *) printf '90' ;;
  esac
}

paint() {
  local item="$1"
  local value="$2"
  if [ -z "$value" ]; then
    return
  fi
  local code
  code="$(color_code_for_item "$item")"
  printf '\\033[%sm%s\\033[0m' "$code" "$value"
}

label_for_item() {
  case "$1" in
    git-diff) printf 'diff' ;;
    context-used|context-remaining) printf 'ctx' ;;
    context-window-size) printf 'window' ;;
    tokens-used|tokens-in|tokens-out) printf 'tokens' ;;
    session-id) printf 'session' ;;
    cli-version) printf 'version' ;;
    *) printf '' ;;
  esac
}

item_value() {
  local item="$1"
  case "$item" in
    model)
      json_value '.model.display_name // .model.id'
      ;;
    model-with-params)
      local model
      local param
      local model_lower
      local param_lower
      model="$(json_value '.model.display_name // .model.id')"
      param="$(json_value '.model.param_summary')"
      if [ -n "$model" ] && [ -n "$param" ]; then
        model_lower="$(printf '%s' "$model" | tr '[:upper:]' '[:lower:]')"
        param_lower="$(printf '%s' "$param" | tr '[:upper:]' '[:lower:]')"
        if [[ "$model_lower" == *"$param_lower"* ]]; then
          printf '%s' "$model"
        else
          printf '%s %s' "$model" "$param"
        fi
      elif [ -n "$model" ]; then
        printf '%s' "$model"
      fi
      ;;
    current-dir)
      local cwd
      cwd="$(json_value '.workspace.current_dir // .cwd')"
      home_shorten "$cwd"
      ;;
    project-name)
      project_name
      ;;
    git-branch)
      git_branch
      ;;
    git-diff)
      git_diff_summary
      ;;
    context-used)
      local used
      used="$(json_value '(.context_window.used_percentage // empty) | if . == null then empty else (. | round | tostring) end')"
      if [ -n "$used" ]; then
        printf '%s%% used' "$used"
      fi
      ;;
    context-remaining)
      local remaining
      remaining="$(json_value '(.context_window.remaining_percentage // empty) | if . == null then empty else (. | round | tostring) end')"
      if [ -n "$remaining" ]; then
        printf '%s%% left' "$remaining"
      fi
      ;;
    context-window-size)
      local size
      local size_k
      size="$(json_value '.context_window.context_window_size')"
      if [ -n "$size" ]; then
        size_k="$(format_k "$size")"
        printf '%s window' "$size_k"
      fi
      ;;
    tokens-used)
      local total
      local total_k
      total="$(json_value '((.context_window.total_input_tokens // 0) + (.context_window.total_output_tokens // 0))')"
      if [ -n "$total" ] && [ "$total" != "0" ]; then
        total_k="$(format_k "$total")"
        printf '%s used' "$total_k"
      fi
      ;;
    tokens-in)
      local input_tokens
      local input_tokens_k
      input_tokens="$(json_value '.context_window.total_input_tokens')"
      if [ -n "$input_tokens" ]; then
        input_tokens_k="$(format_k "$input_tokens")"
        printf '%s in' "$input_tokens_k"
      fi
      ;;
    tokens-out)
      local output_tokens
      local output_tokens_k
      output_tokens="$(json_value '.context_window.total_output_tokens')"
      if [ -n "$output_tokens" ]; then
        output_tokens_k="$(format_k "$output_tokens")"
        printf '%s out' "$output_tokens_k"
      fi
      ;;
    session-id)
      json_value '.session_id'
      ;;
    session-name)
      json_value '.session_name'
      ;;
    cli-version)
      json_value '.version'
      ;;
    vim-mode)
      local mode
      mode="$(json_value '.vim.mode')"
      if [ -n "$mode" ]; then
        printf '%s' "$mode"
      fi
      ;;
    worktree-name)
      local wt
      wt="$(json_value '.worktree.name')"
      if [ -n "$wt" ]; then
        printf '%s' "$wt"
      fi
      ;;
  esac
}

segments=()
for item in "\${ITEMS[@]}"; do
  value="$(item_value "$item" || true)"
  if [ -n "$value" ]; then
    label="$(label_for_item "$item")"
    if [ -n "$label" ]; then
      value="$label: $value"
    fi
    segments+=("$(paint "$item" "$value")")
  fi
done

if [ "\${#segments[@]}" -eq 0 ]; then
  exit 0
fi

output=""
for segment in "\${segments[@]}"; do
  if [ -z "$output" ]; then
    output="$segment"
  else
    output="$output$SEPARATOR$segment"
  fi
done

printf '%s\\n' "$output"
`;
}
