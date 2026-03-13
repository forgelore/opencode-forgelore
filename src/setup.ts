/**
 * opencode-betterspec setup
 * Run with: bunx @betterspec/opencode
 *
 * This script:
 * 1. Adds "@betterspec/opencode" to ~/.config/opencode/opencode.json plugin[]
 * 2. Installs @betterspec/cli globally
 * 3. Runs `betterspec init` in the current project (scaffolds specs + skill)
 * 4. Prompts for model selection per agent role (searchable autocomplete)
 * 5. Copies agent definitions to .opencode/agents/ with selected models
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import chalk from "chalk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");

// ─── Theme ──────────────────────────────────────────────────

const sedona = chalk.hex("#CC5500");
const accent = chalk.hex("#F5A050");
const lore = chalk.hex("#7C3AED");
const muted = chalk.hex("#6B7280");

function step(n: number, msg: string) {
  p.log.step(sedona(`${n}.`) + " " + chalk.bold(msg));
}

function ok(msg: string) {
  p.log.success(msg);
}

function warn(msg: string) {
  p.log.warn(msg);
}

function fail(msg: string) {
  p.log.error(msg);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// ─── Agent Role Definitions ─────────────────────────────────

interface AgentRole {
  file: string;
  name: string;
  description: string;
  recommendation: string;
  defaultModel: string;
}

const AGENT_ROLES: AgentRole[] = [
  {
    file: "betterspec-planner.md",
    name: "Planner",
    description: "Breaks down proposals into detailed specs, requirements, and task plans.",
    recommendation: "Best with strong reasoning models (opus-class or o1-class).",
    defaultModel: "anthropic/claude-opus-4-20250514",
  },
  {
    file: "betterspec-builder.md",
    name: "Builder",
    description: "Implements tasks from specs — writes code, runs tests, updates task status.",
    recommendation: "Best with fast, capable coding models (sonnet-class).",
    defaultModel: "anthropic/claude-sonnet-4-20250514",
  },
  {
    file: "betterspec-validator.md",
    name: "Validator",
    description: "Independently verifies implementation against specs with clean context.",
    recommendation: "Best with a different provider than builder for diverse review.",
    defaultModel: "anthropic/claude-sonnet-4-20250514",
  },
  {
    file: "betterspec-archivist.md",
    name: "Archivist",
    description: "Archives completed changes and extracts knowledge for future reference.",
    recommendation: "Any capable model works — fast models preferred.",
    defaultModel: "anthropic/claude-sonnet-4-20250514",
  },
];

// ─── Model Discovery ────────────────────────────────────────

async function queryAvailableModels(): Promise<string[]> {
  try {
    const output = execSync("opencode models", {
      encoding: "utf-8",
      timeout: 10_000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const models = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.includes("/"));
    return models.length > 0 ? models : [];
  } catch {
    return [];
  }
}

// ─── Model Selection ────────────────────────────────────────

function buildModelOptions(
  availableModels: string[],
  defaultModel: string
): { value: string; label?: string; hint?: string }[] {
  const options: { value: string; label?: string; hint?: string }[] = [];

  // Put default first if it's in the list
  if (availableModels.includes(defaultModel)) {
    options.push({
      value: defaultModel,
      hint: "default",
    });
    for (const m of availableModels) {
      if (m !== defaultModel) options.push({ value: m });
    }
  } else if (availableModels.length > 0) {
    // Default not in available list — add it as first option anyway
    options.push({
      value: defaultModel,
      hint: "default — may not be available",
    });
    for (const m of availableModels) {
      options.push({ value: m });
    }
  } else {
    // No models discovered — just show default
    options.push({
      value: defaultModel,
      hint: "default",
    });
  }

  return options;
}

async function promptForModels(
  roles: AgentRole[],
  availableModels: string[]
): Promise<Map<string, string>> {
  const selections = new Map<string, string>();
  const interactive = process.stdin.isTTY && process.stdout.isTTY;

  if (!interactive) {
    // Non-interactive: use all defaults silently (NFR-3)
    for (const role of roles) {
      selections.set(role.file, role.defaultModel);
    }
    return selections;
  }

  // Ask if user wants to customize or accept defaults (FR-5)
  const customize = await p.confirm({
    message: "Configure models for each agent role?",
    initialValue: false,
  });

  if (p.isCancel(customize)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (!customize) {
    // Accept all defaults
    for (const role of roles) {
      selections.set(role.file, role.defaultModel);
    }

    p.note(
      roles
        .map((r) => `${sedona(r.name.padEnd(12))} ${muted(r.defaultModel)}`)
        .join("\n"),
      "Using default models"
    );
    return selections;
  }

  // Per-role autocomplete prompts (FR-1, FR-2, FR-3)
  for (const role of roles) {
    // Show role context before the prompt
    p.note(
      [
        `${chalk.bold(role.description)}`,
        "",
        `${accent("Recommendation:")} ${role.recommendation}`,
        `${muted("Default:")} ${role.defaultModel}`,
      ].join("\n"),
      `${sedona(role.name)} Agent`
    );

    const options = buildModelOptions(availableModels, role.defaultModel);

    if (options.length > 1) {
      // Searchable autocomplete with available models
      const selected = await p.autocomplete({
        message: `Model for ${sedona(role.name)}`,
        options,
        placeholder: "Type to search or enter a custom model ID",
        initialValue: role.defaultModel,
      });

      if (p.isCancel(selected)) {
        p.cancel("Setup cancelled.");
        process.exit(0);
      }

      selections.set(role.file, selected);
    } else {
      // No model list — free text input with default
      const selected = await p.text({
        message: `Model for ${sedona(role.name)}`,
        placeholder: role.defaultModel,
        defaultValue: role.defaultModel,
        validate: (val) => {
          if (!val) return "Please enter a model ID";
          if (!val.includes("/"))
            return "Model ID should be in provider/model format (e.g. anthropic/claude-sonnet-4-20250514)";
          return undefined;
        },
      });

      if (p.isCancel(selected)) {
        p.cancel("Setup cancelled.");
        process.exit(0);
      }

      selections.set(role.file, selected);
    }
  }

  // Summary
  p.note(
    roles
      .map((r) => {
        const chosen = selections.get(r.file)!;
        const isDefault = chosen === r.defaultModel;
        return `${sedona(r.name.padEnd(12))} ${isDefault ? muted(chosen) : chalk.cyan(chosen)}`;
      })
      .join("\n"),
    "Selected models"
  );

  return selections;
}

// ─── Frontmatter Model Injection ────────────────────────────

function injectModel(templateContent: string, model: string): string {
  return templateContent.replace(/^(model:\s*).+$/m, `$1${model}`);
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const cwd = process.cwd();

  p.intro(`${sedona.bold("betterspec")} ${muted("+ opencode")}`);

  // ── Step 1: Add plugin to opencode.json ──────────────────

  step(1, "Adding plugin to OpenCode config");

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

    const pluginName = "@betterspec/opencode";
    if (!config.plugin.includes(pluginName)) {
      config.plugin.push(pluginName);
      await writeFile(opencodeConfigPath, JSON.stringify(config, null, 2) + "\n");
      ok(`Added ${chalk.cyan(pluginName)} to config`);
    } else {
      ok(`${chalk.cyan(pluginName)} already in plugin list`);
    }
  } catch (err) {
    fail(`Failed to update OpenCode config: ${err}`);
    p.log.info(
      muted(`Manually add "@betterspec/opencode" to plugin[] in ${opencodeConfigPath}`)
    );
  }

  // ── Step 2: Install @betterspec/cli globally ──────────────

  step(2, "Installing @betterspec/cli");

  try {
    execSync("which betterspec", { stdio: "ignore" });
    ok("betterspec CLI already installed");
  } catch {
    try {
      execSync("bun i -g @betterspec/cli", { stdio: "inherit" });
      ok("Installed @betterspec/cli globally");
    } catch {
      warn("Could not install @betterspec/cli globally");
      p.log.info(muted("Run manually: bun i -g @betterspec/cli"));
    }
  }

  // ── Step 3: Run betterspec init ───────────────────────────

  step(3, "Initializing betterspec in project");

  const betterspecConfigPath = resolve(cwd, "betterspec/betterspec.json");
  if (await fileExists(betterspecConfigPath)) {
    ok("betterspec already initialized");
  } else {
    try {
      execSync("betterspec init", { cwd, stdio: "inherit" });
      ok("betterspec initialized");
    } catch {
      warn("betterspec init requires interactive input — run it manually");
      p.log.info(muted("Run: betterspec init"));
    }
  }

  // ── Step 4: Model selection ─────────────────────────────

  step(4, "Configuring agent models");

  const s = p.spinner();
  s.start("Querying available models");
  const availableModels = await queryAvailableModels();
  if (availableModels.length > 0) {
    s.stop(`Found ${availableModels.length} available models`);
  } else {
    s.stop(muted("Could not query models — manual input available"));
  }

  const modelSelections = await promptForModels(AGENT_ROLES, availableModels);

  // ── Step 5: Write agents with selected models ───────────

  step(5, "Setting up OpenCode agents");

  const agentsSrc = join(packageRoot, "agents");
  const agentsDest = resolve(cwd, ".opencode/agents");

  try {
    await mkdir(agentsDest, { recursive: true });

    for (const role of AGENT_ROLES) {
      const src = join(agentsSrc, role.file);
      const dest = join(agentsDest, role.file);

      if (await fileExists(src)) {
        const template = await readFile(src, "utf-8");
        const selectedModel = modelSelections.get(role.file) ?? role.defaultModel;
        const content = injectModel(template, selectedModel);
        await writeFile(dest, content);
        ok(`${muted(".opencode/agents/")}${role.file}`);
      } else {
        warn(`Agent template not found: ${role.file}`);
      }
    }
  } catch (err) {
    fail(`Failed to write agents: ${err}`);
    p.log.info(muted("Copy agents manually from the @betterspec/opencode package"));
  }

  // ── Done ─────────────────────────────────────────────────

  p.note(
    [
      `${chalk.cyan("betterspec propose")} ${muted('"your idea"')}  ${muted("— create a spec")}`,
      `${chalk.cyan("betterspec status")}               ${muted("— see project state")}`,
      `${chalk.cyan("opencode")}                       ${muted("— start coding with agents")}`,
      "",
      muted("To change agent models later, edit .opencode/agents/*.md"),
    ].join("\n"),
    "Next steps"
  );

  p.outro(`${sedona.bold("Setup complete!")}`);
}

main().catch((err) => {
  p.cancel(`Setup failed: ${err}`);
  process.exit(1);
});
