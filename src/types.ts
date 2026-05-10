import os from "node:os";
import path from "node:path";

export type StatusItemId =
  | "model"
  | "model-with-params"
  | "current-dir"
  | "project-name"
  | "git-branch"
  | "context-used"
  | "context-remaining"
  | "context-window-size"
  | "tokens-used"
  | "tokens-in"
  | "tokens-out"
  | "session-id"
  | "session-name"
  | "cli-version"
  | "vim-mode"
  | "worktree-name"
  | "git-diff";

export interface StatusItemDefinition {
  id: StatusItemId;
  title: string;
  description: string;
  preview: string;
  defaultEnabled: boolean;
}

export interface SetupConfig {
  version: number;
  items: StatusItemId[];
}

export const DEFAULT_ITEMS: StatusItemId[] = [
  "model",
  "current-dir",
  "git-branch",
  "context-used"
];

export const STATUS_ITEMS: StatusItemDefinition[] = [
  {
    id: "model",
    title: "model",
    description: "Current model name",
    preview: "gpt-5",
    defaultEnabled: false
  },
  {
    id: "model-with-params",
    title: "model-with-params",
    description: "Model name with parameter summary",
    preview: "gpt-5 (Thinking)",
    defaultEnabled: true
  },
  {
    id: "current-dir",
    title: "current-dir",
    description: "Current working directory",
    preview: "~/work/project",
    defaultEnabled: true
  },
  {
    id: "project-name",
    title: "project-name",
    description: "Project name (git root preferred)",
    preview: "project",
    defaultEnabled: false
  },
  {
    id: "git-branch",
    title: "git-branch",
    description: "Current git branch",
    preview: "feat/statusline",
    defaultEnabled: true
  },
  {
    id: "git-diff",
    title: "git-diff",
    description: "Compact git diff summary",
    preview: "+12 -3",
    defaultEnabled: false
  },
  {
    id: "context-used",
    title: "context-used",
    description: "Context window used percentage",
    preview: "Context 36% used",
    defaultEnabled: true
  },
  {
    id: "context-remaining",
    title: "context-remaining",
    description: "Context window remaining percentage",
    preview: "Context 64% left",
    defaultEnabled: false
  },
  {
    id: "context-window-size",
    title: "context-window-size",
    description: "Context window size",
    preview: "200k window",
    defaultEnabled: false
  },
  {
    id: "tokens-used",
    title: "tokens-used",
    description: "Input + output token total",
    preview: "15.4k used",
    defaultEnabled: true
  },
  {
    id: "tokens-in",
    title: "tokens-in",
    description: "Input token total",
    preview: "12k in",
    defaultEnabled: false
  },
  {
    id: "tokens-out",
    title: "tokens-out",
    description: "Output token total",
    preview: "3.4k out",
    defaultEnabled: false
  },
  {
    id: "session-id",
    title: "session-id",
    description: "Session ID",
    preview: "abc123",
    defaultEnabled: false
  },
  {
    id: "session-name",
    title: "session-name",
    description: "Session name (when set)",
    preview: "my session",
    defaultEnabled: false
  },
  {
    id: "cli-version",
    title: "cli-version",
    description: "Cursor CLI version",
    preview: "1.2.3",
    defaultEnabled: false
  },
  {
    id: "vim-mode",
    title: "vim-mode",
    description: "Vim mode",
    preview: "NORMAL",
    defaultEnabled: false
  },
  {
    id: "worktree-name",
    title: "worktree-name",
    description: "Worktree name",
    preview: "feature-x",
    defaultEnabled: false
  }
];

export function defaultConfig(): SetupConfig {
  return {
    version: 1,
    items: [...DEFAULT_ITEMS]
  };
}

const home = os.homedir();

export const PATHS = {
  configPath: path.join(home, ".config", "cursor-statusline", "config.toml"),
  scriptPath: path.join(home, ".cursor", "statusline.sh"),
  cursorCliConfigPath: path.join(home, ".cursor", "cli-config.json")
};
