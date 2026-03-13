/**
 * opencode-betterspec tools
 * All tools use the OpenCode `tool()` helper with zod schemas.
 * Tools are created inside a factory that closes over the PluginInput
 * so they can access ctx.$ (BunShell) and ctx.directory.
 */

import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { PluginInput } from "@opencode-ai/plugin";
import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  configExists,
  listChanges,
  readConfig,
  summarizeTasks,
} from "@betterspec/core";

/**
 * Read the model from an agent's YAML frontmatter on disk.
 * Falls back to the provided default if the file doesn't exist or can't be parsed.
 */
async function readModelFromAgent(
  directory: string,
  agentFile: string,
  fallback: string
): Promise<string> {
  try {
    const agentPath = resolve(directory, ".opencode/agents", agentFile);
    const content = await readFile(agentPath, "utf-8");
    const match = content.match(/^model:\s*(.+)$/m);
    return match?.[1]?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export function createTools(ctx: PluginInput): Record<string, ToolDefinition> {
  const { $ } = ctx;

  /**
   * betterspec:run — invoke any betterspec CLI command from within OpenCode
   */
  const run = tool({
    description:
      "Run a betterspec CLI command (e.g. status, propose, verify, list, diff). " +
      "Returns the command output. Use this to interact with the spec system.",
    args: {
      command: tool.schema
        .string()
        .describe(
          'The betterspec subcommand and arguments, e.g. "status", "list", "verify my-change", "diff my-change"'
        ),
    },
    async execute(args, toolCtx) {
      try {
        const result = await $`betterspec ${args.command}`
          .cwd(toolCtx.directory)
          .quiet();
        return result.text() || "(no output)";
      } catch (error: any) {
        const stderr = error?.stderr?.toString?.() ?? "";
        const stdout = error?.stdout?.toString?.() ?? "";
        return `Command failed:\n${stderr || stdout || String(error)}`;
      }
    },
  });

  /**
   * betterspec:status — structured overview of all changes and progress
   */
  const status = tool({
    description:
      "Get a structured overview of all betterspec changes, their status, and task progress. " +
      "Returns machine-readable data about the spec system state.",
    args: {
      includeArchived: tool.schema
        .boolean()
        .optional()
        .describe("Include archived changes (default: false)"),
    },
    async execute(args, toolCtx) {
      if (!(await configExists(toolCtx.directory))) {
        return "betterspec is not initialized in this project. Run `betterspec init` first.";
      }

      const config = await readConfig(toolCtx.directory);
      const changes = await listChanges(
        toolCtx.directory,
        args.includeArchived ?? false
      );

      if (changes.length === 0) {
        return `betterspec initialized (mode: ${config.mode}), no active changes.\nRun \`betterspec propose "your idea"\` to create one.`;
      }

      const lines: string[] = [
        `Mode: ${config.mode} | ${changes.length} change(s)`,
        "",
      ];

      for (const change of changes) {
        const tasks = summarizeTasks(change.tasks);
        lines.push(
          `## ${change.name} [${change.status}]`,
          `  Tasks: ${tasks.passed}/${tasks.total} passed, ${tasks.failed} failed, ${tasks.inProgress} in-progress`,
          `  Updated: ${change.updatedAt}`,
          `  Specs: betterspec/changes/${change.name}/`,
          ""
        );
      }

      return lines.join("\n");
    },
  });

  /**
   * betterspec:build — spawn a builder agent via opencode run
   */
  const build = tool({
    description:
      "Dispatch a background builder agent to implement tasks from a betterspec change spec. " +
      "The builder runs in a separate opencode session with its own model.",
    args: {
      changeName: tool.schema
        .string()
        .describe("Name of the betterspec change to build"),
      taskIds: tool.schema
        .string()
        .optional()
        .describe('Comma-separated task IDs to implement, e.g. "task-1,task-2"'),
      model: tool.schema
        .string()
        .optional()
        .describe("Override model for builder (default: anthropic/claude-sonnet-4-20250514)"),
    },
    async execute(args, toolCtx) {
      const agentModel = await readModelFromAgent(
        toolCtx.directory,
        "betterspec-builder.md",
        "anthropic/claude-sonnet-4-20250514"
      );
      const model = args.model ?? agentModel;
      const taskFilter = args.taskIds
        ? `Tasks to complete: ${args.taskIds}`
        : "Complete all pending tasks.";

      const prompt = [
        `You are implementing tasks for change "${args.changeName}".`,
        taskFilter,
        "",
        "Read the spec files:",
        `- betterspec/changes/${args.changeName}/specs/requirements.md`,
        `- betterspec/changes/${args.changeName}/specs/scenarios.md`,
        `- betterspec/changes/${args.changeName}/design.md`,
        `- betterspec/changes/${args.changeName}/tasks.md`,
        "",
        "Follow patterns in betterspec/knowledge/patterns.md.",
        "Respect architecture in betterspec/knowledge/architecture.md.",
        "Update task status in tasks.md as you complete each task.",
      ].join("\n");

      try {
        toolCtx.metadata({ title: `Building ${args.changeName}...` });
        const result = await $`opencode run --model ${model} --agent betterspec-builder ${prompt}`
          .cwd(toolCtx.directory)
          .quiet();
        return `Builder completed.\n\n${result.text()}`;
      } catch (error: any) {
        return `Builder failed: ${error?.stderr?.toString?.() ?? String(error)}`;
      }
    },
  });

  /**
   * betterspec:validate — spawn a validation agent with CLEAN context
   * GOLDEN RULE: The agent that builds NEVER validates its own work.
   */
  const validate = tool({
    description:
      "Dispatch a validation agent to independently verify a change against its specs. " +
      "The validator runs in a completely separate session with clean context. " +
      "IMPORTANT: The agent that builds NEVER validates its own work.",
    args: {
      changeName: tool.schema
        .string()
        .describe("Name of the betterspec change to validate"),
      model: tool.schema
        .string()
        .optional()
        .describe("Override model for validator (default: anthropic/claude-sonnet-4-20250514)"),
    },
    async execute(args, toolCtx) {
      const agentModel = await readModelFromAgent(
        toolCtx.directory,
        "betterspec-validator.md",
        "anthropic/claude-sonnet-4-20250514"
      );
      const model = args.model ?? agentModel;

      const prompt = [
        "You are a VALIDATION AGENT. You have NOT seen the build process.",
        "Independently verify that the implementation matches the specs.",
        "",
        `Validate change: "${args.changeName}"`,
        "",
        "Read these files:",
        `- betterspec/changes/${args.changeName}/specs/requirements.md`,
        `- betterspec/changes/${args.changeName}/specs/scenarios.md`,
        `- betterspec/changes/${args.changeName}/design.md`,
        `- betterspec/changes/${args.changeName}/tasks.md`,
        "",
        "Then review the actual implementation code referenced in design.",
        "For each requirement, check if it's met. Walk through each scenario.",
        "",
        "Report: PASS/FAIL/NEEDS_REVIEW verdict, per-requirement status, issues, suggestions.",
      ].join("\n");

      try {
        toolCtx.metadata({ title: `Validating ${args.changeName}...` });
        const result = await $`opencode run --model ${model} --agent betterspec-validator ${prompt}`
          .cwd(toolCtx.directory)
          .quiet();
        return `Validation complete.\n\n${result.text()}`;
      } catch (error: any) {
        return `Validator failed: ${error?.stderr?.toString?.() ?? String(error)}`;
      }
    },
  });

  return {
    "betterspec:run": run,
    "betterspec:status": status,
    "betterspec:build": build,
    "betterspec:validate": validate,
  };
}
