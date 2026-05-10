#!/usr/bin/env node

import chalk from "chalk";

import { runSetup } from "./setup.js";

function printHelp(): void {
  console.log("cursor-statusline");
  console.log("");
  console.log("Usage:");
  console.log("  npx -y cursor-statusline");
  console.log("  npx -y cursor-statusline --help");
  console.log("");
  console.log("Description:");
  console.log("  Runs interactive setup, generates ~/.cursor/statusline.sh, and");
  console.log("  updates statusLine.command in ~/.cursor/cli-config.json.");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  if (args.length > 0) {
    console.error(chalk.red(`Unsupported arguments: ${args.join(" ")}`));
    console.error("Help: npx -y cursor-statusline --help");
    process.exitCode = 1;
    return;
  }

  await runSetup();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`Error: ${message}`));
  process.exitCode = 1;
});
