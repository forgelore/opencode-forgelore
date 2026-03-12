/**
 * opencode-forgelore setup
 * Run with: bunx opencode-forgelore
 *
 * This script:
 * 1. Adds "opencode-forgelore" to ~/.config/opencode/opencode.json plugin[]
 * 2. Installs @forgelore/cli globally
 * 3. Runs `forgelore init` in the current project (scaffolds specs + skill)
 * 4. Copies OpenCode-specific agent definitions to .opencode/agents/
 */

import { readFile, writeFile, mkdir, copyFile, access } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");

// ─── Colors (minimal, no deps) ──────────────────────────────

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const sedona = (s: string) => `\x1b[38;2;204;85;0m${s}\x1b[0m`;

function log(icon: string, msg: string) {
  console.log(`  ${icon} ${msg}`);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const cwd = process.cwd();

  console.log("");
  console.log(sedona(bold("  forgelore")), dim("+ opencode"));
  console.log(dim("  spec-driven development for AI-assisted teams"));
  console.log("");

  // ── Step 1: Add plugin to opencode.json ──────────────────

  log("1.", bold("Adding plugin to OpenCode config..."));

  const opencodeConfigPath = resolve(
    process.env.HOME || "~",
    ".config/opencode/opencode.json"
  );

  try {
    let config: any = {};
    if (await fileExists(opencodeConfigPath)) {
      const raw = await readFile(opencodeConfigPath, "utf-8");
      config = JSON.parse(raw);
    } else {
      await mkdir(dirname(opencodeConfigPath), { recursive: true });
    }

    if (!config.plugin) {
      config.plugin = [];
    }

    const pluginName = "@forgelore/opencode";
    if (!config.plugin.includes(pluginName)) {
      config.plugin.push(pluginName);
      await writeFile(opencodeConfigPath, JSON.stringify(config, null, 2) + "\n");
      log(green("✓"), `Added ${cyan(pluginName)} to ${dim(opencodeConfigPath)}`);
    } else {
      log(green("✓"), `${cyan(pluginName)} already in plugin list`);
    }
  } catch (err) {
    log(red("✗"), `Failed to update OpenCode config: ${err}`);
    log("", dim(`You can manually add "opencode-forgelore" to the plugin array in ${opencodeConfigPath}`));
  }

  // ── Step 2: Install @forgelore/cli globally ──────────────

  log("2.", bold("Installing @forgelore/cli..."));

  try {
    execSync("which forgelore", { stdio: "ignore" });
    log(green("✓"), "forgelore CLI already installed");
  } catch {
    try {
      execSync("bun i -g @forgelore/cli", { stdio: "inherit" });
      log(green("✓"), "Installed @forgelore/cli globally");
    } catch {
      log(yellow("!"), "Could not install @forgelore/cli globally");
      log("", dim("Run manually: bun i -g @forgelore/cli"));
    }
  }

  // ── Step 3: Run forgelore init ───────────────────────────

  log("3.", bold("Initializing forgelore in project..."));

  const forgeloreConfigPath = resolve(cwd, "forgelore/forgelore.json");
  if (await fileExists(forgeloreConfigPath)) {
    log(green("✓"), "forgelore already initialized");
  } else {
    try {
      execSync("forgelore init", { cwd, stdio: "inherit" });
      log(green("✓"), "forgelore initialized");
    } catch {
      log(yellow("!"), "forgelore init requires interactive input — run it manually");
      log("", dim("Run: forgelore init"));
    }
  }

  // ── Step 4: Copy agents to .opencode/agents/ ────────────

  log("4.", bold("Setting up OpenCode agents..."));

  const agentsSrc = join(packageRoot, "agents");
  const agentsDest = resolve(cwd, ".opencode/agents");

  const agentFiles = [
    "forgelore-builder.md",
    "forgelore-validator.md",
    "forgelore-planner.md",
    "forgelore-archivist.md",
  ];

  try {
    await mkdir(agentsDest, { recursive: true });

    for (const file of agentFiles) {
      const src = join(agentsSrc, file);
      const dest = join(agentsDest, file);

      if (await fileExists(src)) {
        await copyFile(src, dest);
        log(green("✓"), `${dim(".opencode/agents/")}${file}`);
      } else {
        log(yellow("!"), `Agent template not found: ${file}`);
      }
    }
  } catch (err) {
    log(red("✗"), `Failed to copy agents: ${err}`);
    log("", dim("You can copy them manually from the opencode-forgelore package"));
  }

  // ── Done ─────────────────────────────────────────────────

  console.log("");
  log(sedona("✓"), bold("Setup complete!"));
  console.log("");
  console.log(dim("  Next steps:"));
  console.log(`    ${cyan("forgelore propose")} ${dim('"your idea"')}  — create a spec`);
  console.log(`    ${cyan("forgelore status")}               — see project state`);
  console.log(`    ${cyan("opencode")}                       — start coding with agents`);
  console.log("");
}

main().catch((err) => {
  console.error(red("Setup failed:"), err);
  process.exit(1);
});
