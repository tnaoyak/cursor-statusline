import fs from "node:fs/promises";
import path from "node:path";

import { PATHS, SetupConfig, StatusItemId, defaultConfig } from "./types.js";

function parseBoolean(source: string, key: string): boolean | undefined {
  const match = source.match(new RegExp(`^\\s*${key}\\s*=\\s*(true|false)\\s*$`, "m"));
  if (!match) return undefined;
  return match[1] === "true";
}

function parseItems(source: string): StatusItemId[] | undefined {
  const match = source.match(/^\s*items\s*=\s*\[(.*?)\]\s*$/ms);
  if (!match) return undefined;
  const raw = match[1].trim();
  if (!raw) return [];

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^"(.*)"$/, "$1")) as StatusItemId[];

  return parts;
}

function toTomlString(config: SetupConfig): string {
  const items = config.items.map((item) => `"${item}"`).join(", ");
  return [
    "version = 1",
    `use_colors = ${config.useColors}`,
    `show_labels = ${config.showLabels}`,
    `items = [${items}]`,
    "",
    "[git]",
    `enabled = ${config.git.enabled}`,
    `show_diff = ${config.git.showDiff}`,
    ""
  ].join("\n");
}

export async function loadConfig(): Promise<SetupConfig> {
  try {
    const raw = await fs.readFile(PATHS.configPath, "utf8");
    const base = defaultConfig();
    const parsedItems = parseItems(raw);
    const useColors = parseBoolean(raw, "use_colors");
    const showLabels = parseBoolean(raw, "show_labels");
    const gitEnabled = parseBoolean(raw, "enabled");
    const gitShowDiff = parseBoolean(raw, "show_diff");

    return {
      version: 1,
      useColors: useColors ?? base.useColors,
      showLabels: showLabels ?? base.showLabels,
      items: parsedItems && parsedItems.length > 0 ? parsedItems : base.items,
      git: {
        enabled: gitEnabled ?? base.git.enabled,
        showDiff: gitShowDiff ?? base.git.showDiff
      }
    };
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(config: SetupConfig): Promise<void> {
  await fs.mkdir(path.dirname(PATHS.configPath), { recursive: true });
  await fs.writeFile(PATHS.configPath, toTomlString(config), "utf8");
}
