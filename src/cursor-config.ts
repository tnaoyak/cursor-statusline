import fs from "node:fs/promises";
import path from "node:path";

import { PATHS } from "./types.js";

interface CursorCliConfig {
  statusLine?: {
    type?: string;
    command?: string;
    padding?: number;
    updateIntervalMs?: number;
    timeoutMs?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function applyCursorCliConfig(): Promise<void> {
  let current: CursorCliConfig = {};
  try {
    const raw = await fs.readFile(PATHS.cursorCliConfigPath, "utf8");
    current = JSON.parse(raw) as CursorCliConfig;
  } catch {
    current = {};
  }

  const currentStatusLine = current.statusLine ?? {};
  current.statusLine = {
    ...currentStatusLine,
    type: "command",
    command: "~/.cursor/statusline.sh"
  };

  await fs.mkdir(path.dirname(PATHS.cursorCliConfigPath), { recursive: true });
  await fs.writeFile(
    PATHS.cursorCliConfigPath,
    `${JSON.stringify(current, null, 2)}\n`,
    "utf8"
  );
}
