import { SetupConfig } from "./types.js";

function shellQuote(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

export function buildStatuslineScript(config: SetupConfig): string {
  const items = config.items.map((item) => `  ${shellQuote(item)}`).join("\n");

  return `#!/usr/bin/env bash
set -euo pipefail

USE_COLORS=${config.useColors ? 1 : 0}
SHOW_LABELS=${config.showLabels ? 1 : 0}
GIT_ENABLED=${config.git.enabled ? 1 : 0}
GIT_SHOW_DIFF=${config.git.showDiff ? 1 : 0}

ITEMS=(
${items}
)

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

PAYLOAD="$(cat)"

json_value() {
  local query="$1"
  printf '%s' "$PAYLOAD" | jq -r "$query // empty" 2>/dev/null
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
  if [ "$GIT_ENABLED" -ne 1 ]; then
    return
  fi
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
  if [ "$GIT_ENABLED" -ne 1 ] || [ "$GIT_SHOW_DIFF" -ne 1 ]; then
    return
  fi
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
  if [ "$USE_COLORS" -eq 1 ]; then
    local code
    code="$(color_code_for_item "$item")"
    printf '\\033[%sm%s\\033[0m' "$code" "$value"
  else
    printf '%s' "$value"
  fi
}

label_for_item() {
  case "$1" in
    model|model-with-params) printf 'model' ;;
    current-dir) printf 'cwd' ;;
    project-name) printf 'project' ;;
    git-branch) printf 'branch' ;;
    git-diff) printf 'diff' ;;
    context-used|context-remaining) printf 'ctx' ;;
    context-window-size) printf 'window' ;;
    tokens-used|tokens-in|tokens-out) printf 'tokens' ;;
    session-id) printf 'session' ;;
    session-name) printf 'name' ;;
    cli-version) printf 'version' ;;
    vim-mode) printf 'vim' ;;
    worktree-name) printf 'worktree' ;;
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
      size="$(json_value '.context_window.context_window_size')"
      if [ -n "$size" ]; then
        printf '%s window' "$size"
      fi
      ;;
    tokens-used)
      local total
      total="$(json_value '((.context_window.total_input_tokens // 0) + (.context_window.total_output_tokens // 0))')"
      if [ -n "$total" ] && [ "$total" != "0" ]; then
        printf '%s used' "$total"
      fi
      ;;
    tokens-in)
      local input_tokens
      input_tokens="$(json_value '.context_window.total_input_tokens')"
      if [ -n "$input_tokens" ]; then
        printf '%s in' "$input_tokens"
      fi
      ;;
    tokens-out)
      local output_tokens
      output_tokens="$(json_value '.context_window.total_output_tokens')"
      if [ -n "$output_tokens" ]; then
        printf '%s out' "$output_tokens"
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
    if [ "$SHOW_LABELS" -eq 1 ]; then
      label="$(label_for_item "$item")"
      if [ -n "$label" ]; then
        value="$label: $value"
      fi
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
    output="$output · $segment"
  fi
done

printf '%s\\n' "$output"
`;
}
