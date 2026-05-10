import fs from "node:fs/promises";
import path from "node:path";

import chalk from "chalk";
import prompts from "prompts";

import { applyCursorCliConfig } from "./cursor-config.js";
import { loadConfig, saveConfig } from "./config.js";
import { buildStatuslineScript } from "./script-generator.js";
import { PATHS, STATUS_ITEMS, SetupConfig, StatusItemId } from "./types.js";

const CANCELLED = Symbol("setup-cancelled");

function normalizeItems(items: StatusItemId[]): StatusItemId[] {
  const validSet = new Set(STATUS_ITEMS.map((item) => item.id));
  const seen = new Set<StatusItemId>();
  const normalized: StatusItemId[] = [];
  for (const item of items) {
    if (!validSet.has(item) || seen.has(item)) continue;
    seen.add(item);
    normalized.push(item);
  }
  if (normalized.length === 0) {
    return STATUS_ITEMS.filter((item) => item.defaultEnabled).map((item) => item.id);
  }
  return normalized;
}

function colorPreview(item: StatusItemId, value: string): string {
  switch (item) {
    case "model":
    case "model-with-params":
    case "cli-version":
      return chalk.cyan(value);
    case "current-dir":
    case "project-name":
    case "git-branch":
    case "worktree-name":
    case "git-diff":
      return chalk.magenta(value);
    case "context-used":
    case "context-remaining":
    case "context-window-size":
    case "tokens-used":
    case "tokens-in":
    case "tokens-out":
      return chalk.green(value);
    default:
      return chalk.gray(value);
  }
}

function previewLine(config: SetupConfig): string {
  const segments = config.items
    .map((id) => {
      const definition = STATUS_ITEMS.find((item) => item.id === id);
      if (!definition) return "";
      return colorPreview(id, definition.preview);
    })
    .filter(Boolean);
  return segments.join(chalk.dim(" | "));
}

function moveIndex<T>(arr: T[], from: number, to: number): T[] {
  const cloned = [...arr];
  const [item] = cloned.splice(from, 1);
  cloned.splice(to, 0, item);
  return cloned;
}

async function reorderItems(initialItems: StatusItemId[]): Promise<StatusItemId[]> {
  let items = [...initialItems];

  while (true) {
    const { shouldReorder } = await prompts({
      type: "confirm",
      name: "shouldReorder",
      message: "Do you want to reorder selected items? (You can repeat this step)",
      initial: false
    });

    if (!shouldReorder) return items;

    const { fromId } = await prompts({
      type: "select",
      name: "fromId",
      message: "Choose an item to move",
      choices: items.map((id, index) => ({
        title: `${index + 1}. ${id}`,
        value: id
      }))
    });
    if (!fromId) return items;

    const fromIndex = items.indexOf(fromId as StatusItemId);
    if (fromIndex < 0) continue;

    const { toIndex } = await prompts({
      type: "select",
      name: "toIndex",
      message: "Choose destination position",
      choices: items.map((id, index) => ({
        title: `${index + 1}. ${id}`,
        value: index
      }))
    });

    if (typeof toIndex !== "number") return items;
    items = moveIndex(items, fromIndex, toIndex);
  }
}

async function selectItems(initialItems: StatusItemId[]): Promise<StatusItemId[] | typeof CANCELLED> {
  const initialSet = new Set(initialItems);
  const result = await prompts({
    type: "autocompleteMultiselect",
    name: "items",
    message: "Select status line items (search supported)",
    hint: "Type to filter, Space to toggle, Enter to confirm. Reordering comes next.",
    instructions: false,
    min: 1,
    choices: STATUS_ITEMS.map((item) => ({
      title: item.title,
      value: item.id,
      selected: initialSet.has(item.id),
      description: item.description
    }))
  });

  if (!result.items) return CANCELLED;

  return normalizeItems(result.items as StatusItemId[]);
}

async function writeScript(script: string): Promise<void> {
  await fs.mkdir(path.dirname(PATHS.scriptPath), { recursive: true });
  await fs.writeFile(PATHS.scriptPath, script, "utf8");
  await fs.chmod(PATHS.scriptPath, 0o755);
}

function printSummary(config: SetupConfig): void {
  console.log("");
  console.log(chalk.bold("Configuration saved."));
  console.log(`- config: ${PATHS.configPath}`);
  console.log(`- script: ${PATHS.scriptPath}`);
  console.log(`- cli-config: ${PATHS.cursorCliConfigPath}`);
  console.log("");
  console.log(chalk.bold("Preview"));
  console.log(previewLine(config));
  console.log("");
  console.log("Cursor CLI will run ~/.cursor/statusline.sh on subsequent updates.");
}

export async function runSetup(): Promise<void> {
  const current = await loadConfig();

  console.log(chalk.bold("Cursor Statusline Setup"));
  console.log("This wizard generates statusline.sh and updates Cursor CLI config.");
  console.log("Colors are always enabled, and labels are applied automatically by item type.");

  const selectedItems = await selectItems(current.items);
  if (selectedItems === CANCELLED) {
    console.log("Cancelled.");
    return;
  }

  const reorderedItems = await reorderItems(selectedItems);

  const nextConfig: SetupConfig = {
    version: 1,
    items: reorderedItems
  };

  await saveConfig(nextConfig);
  await writeScript(buildStatuslineScript(nextConfig));
  await applyCursorCliConfig();
  printSummary(nextConfig);
}
