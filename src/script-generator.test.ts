import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { buildStatuslineScript } from "./script-generator.js";
import { defaultConfig } from "./types.js";

function stripAnsi(input: string): string {
  return input.replace(/\x1b\[[0-9;]*m/g, "");
}

async function runGeneratedScript(payload: Record<string, unknown>, config = defaultConfig()) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cursor-statusline-test-"));
  const scriptPath = path.join(tempDir, "statusline.sh");
  await fs.writeFile(scriptPath, buildStatuslineScript(config), "utf8");
  await fs.chmod(scriptPath, 0o755);

  const result = spawnSync("bash", [scriptPath], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    cwd: tempDir
  });
  return {
    status: result.status,
    stdout: stripAnsi(result.stdout.trim()),
    stderr: result.stderr.trim()
  };
}

const hasJq = spawnSync("bash", ["-lc", "command -v jq >/dev/null 2>&1"]).status === 0;
const itIfJq = hasJq ? it : it.skip;

describe("defaultConfig", () => {
  it("uses simplified default items", () => {
    expect(defaultConfig().items).toEqual(["model", "current-dir", "git-branch", "context-used"]);
  });
});

describe("buildStatuslineScript", () => {
  itIfJq("uses item-specific labels and keeps model/cwd unlabeled", async () => {
    const config = defaultConfig();

    const payload = {
      model: { display_name: "gpt-5" },
      workspace: { current_dir: "/tmp/project" },
      context_window: { used_percentage: 42 }
    };

    const result = await runGeneratedScript(payload, config);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("gpt-5");
    expect(result.stdout).toContain("/tmp/project");
    expect(result.stdout).toContain("ctx: 42% used");
    expect(result.stdout).not.toContain("model:");
    expect(result.stdout).not.toContain("cwd:");
  });

  itIfJq("avoids duplicated model param summary", async () => {
    const config = defaultConfig();
    config.items = ["model-with-params"];

    const payload = {
      model: {
        display_name: "Codex 5.3 High",
        param_summary: "High"
      }
    };

    const result = await runGeneratedScript(payload, config);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("Codex 5.3 High");
  });

  itIfJq("formats token values in k units", async () => {
    const config = defaultConfig();
    config.items = ["tokens-used", "tokens-in", "tokens-out"];

    const payload = {
      context_window: {
        total_input_tokens: 12000,
        total_output_tokens: 3420
      }
    };

    const result = await runGeneratedScript(payload, config);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("tokens: 15.4k used");
    expect(result.stdout).toContain("tokens: 12k in");
    expect(result.stdout).toContain("tokens: 3.4k out");
  });
});
