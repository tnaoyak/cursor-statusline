import fs from "node:fs/promises";
import path from "node:path";

import { PATHS, SetupConfig, StatusItemId, defaultConfig } from "./types.js";

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
    `items = [${items}]`,
    ""
  ].join("\n");
}

export async function loadConfig(): Promise<SetupConfig> {
  try {
    const raw = await fs.readFile(PATHS.configPath, "utf8");
    const base = defaultConfig();
    const parsedItems = parseItems(raw);

    return {
      version: 1,
      items: parsedItems && parsedItems.length > 0 ? parsedItems : base.items
    };
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(config: SetupConfig): Promise<void> {
  await fs.mkdir(path.dirname(PATHS.configPath), { recursive: true });
  await fs.writeFile(PATHS.configPath, toTomlString(config), "utf8");
}
