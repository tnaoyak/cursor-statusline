import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { applyCursorCliConfig } from "./cursor-config.js";
import { PATHS } from "./types.js";

const originalCursorConfigPath = PATHS.cursorCliConfigPath;
let tempDir: string | null = null;

afterEach(async () => {
  PATHS.cursorCliConfigPath = originalCursorConfigPath;
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

async function prepareTempConfigPath() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cursor-statusline-config-test-"));
  PATHS.cursorCliConfigPath = path.join(tempDir, ".cursor", "cli-config.json");
}

describe("applyCursorCliConfig", () => {
  it("creates statusLine config when cli-config does not exist", async () => {
    await prepareTempConfigPath();
    await applyCursorCliConfig();

    const raw = await fs.readFile(PATHS.cursorCliConfigPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, any>;
    expect(parsed.statusLine).toEqual({
      type: "command",
      command: "~/.cursor/statusline.sh"
    });
  });

  it("merges with existing cli-config fields", async () => {
    await prepareTempConfigPath();
    await fs.mkdir(path.dirname(PATHS.cursorCliConfigPath), { recursive: true });
    await fs.writeFile(
      PATHS.cursorCliConfigPath,
      JSON.stringify(
        {
          theme: "dark",
          statusLine: {
            type: "command",
            command: "old-command",
            padding: 2
          }
        },
        null,
        2
      ),
      "utf8"
    );

    await applyCursorCliConfig();

    const raw = await fs.readFile(PATHS.cursorCliConfigPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, any>;
    expect(parsed.theme).toBe("dark");
    expect(parsed.statusLine).toEqual({
      type: "command",
      command: "~/.cursor/statusline.sh",
      padding: 2
    });
  });
});
