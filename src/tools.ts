/**
 * opencode-forgelore tools
 * All tools use the OpenCode `tool()` helper with zod schemas.
 * Tools are created inside a factory that closes over the PluginInput
 * so they can access ctx.$ (BunShell) and ctx.directory.
 */

import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { PluginInput } from "@opencode-ai/plugin";
import {
  configExists,
  listChanges,
  readConfig,
  summarizeTasks,
} from "@forgelore/core";

export function createTools(ctx: PluginInput): Record<string, ToolDefinition> {
  const { $ } = ctx;

  /**
   * forgelore:run — invoke any forgelore CLI command from within OpenCode
   */
  const run = tool({
    description:
      "Run a forgelore CLI command (e.g. status, propose, verify, list, diff). " +
      "Returns the command output. Use this to interact with the spec system.",
    args: {
      command: tool.schema
        .string()
        .describe(
          'The forgelore subcommand and arguments, e.g. "status", "list", "verify my-change", "diff my-change"'
        ),
    },
    async execute(args, toolCtx) {
      try {
        const result = await $`forgelore ${args.command}`
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
   * forgelore:status — structured overview of all changes and progress
   */
  const status = tool({
    description:
      "Get a structured overview of all forgelore changes, their status, and task progress. " +
      "Returns machine-readable data about the spec system state.",
    args: {
      includeArchived: tool.schema
        .boolean()
        .optional()
        .describe("Include archived changes (default: false)"),
    },
    async execute(args, toolCtx) {
      if (!(await configExists(toolCtx.directory))) {
        return "forgelore is not initialized in this project. Run `forgelore init` first.";
      }

      const config = await readConfig(toolCtx.directory);
      const changes = await listChanges(
        toolCtx.directory,
        args.includeArchived ?? false
      );

      if (changes.length === 0) {
        return `forgelore initialized (mode: ${config.mode}), no active changes.\nRun \`forgelore propose "your idea"\` to create one.`;
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
          `  Specs: forgelore/changes/${change.name}/`,
          ""
        );
      }

      return lines.join("\n");
    },
  });

  /**
   * forgelore:build — spawn a builder agent via opencode run
   */
  const build = tool({
    description:
      "Dispatch a background builder agent to implement tasks from a forgelore change spec. " +
      "The builder runs in a separate opencode session with its own model.",
    args: {
      changeName: tool.schema
        .string()
        .describe("Name of the forgelore change to build"),
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
      const model = args.model ?? "anthropic/claude-sonnet-4-20250514";
      const taskFilter = args.taskIds
        ? `Tasks to complete: ${args.taskIds}`
        : "Complete all pending tasks.";

      const prompt = [
        `You are implementing tasks for change "${args.changeName}".`,
        taskFilter,
        "",
        "Read the spec files:",
        `- forgelore/changes/${args.changeName}/specs/requirements.md`,
        `- forgelore/changes/${args.changeName}/specs/scenarios.md`,
        `- forgelore/changes/${args.changeName}/design.md`,
        `- forgelore/changes/${args.changeName}/tasks.md`,
        "",
        "Follow patterns in forgelore/knowledge/patterns.md.",
        "Respect architecture in forgelore/knowledge/architecture.md.",
        "Update task status in tasks.md as you complete each task.",
      ].join("\n");

      try {
        toolCtx.metadata({ title: `Building ${args.changeName}...` });
        const result = await $`opencode run --model ${model} --agent forgelore-builder ${prompt}`
          .cwd(toolCtx.directory)
          .quiet();
        return `Builder completed.\n\n${result.text()}`;
      } catch (error: any) {
        return `Builder failed: ${error?.stderr?.toString?.() ?? String(error)}`;
      }
    },
  });

  /**
   * forgelore:validate — spawn a validation agent with CLEAN context
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
        .describe("Name of the forgelore change to validate"),
      model: tool.schema
        .string()
        .optional()
        .describe("Override model for validator (default: anthropic/claude-sonnet-4-20250514)"),
    },
    async execute(args, toolCtx) {
      const model = args.model ?? "anthropic/claude-sonnet-4-20250514";

      const prompt = [
        "You are a VALIDATION AGENT. You have NOT seen the build process.",
        "Independently verify that the implementation matches the specs.",
        "",
        `Validate change: "${args.changeName}"`,
        "",
        "Read these files:",
        `- forgelore/changes/${args.changeName}/specs/requirements.md`,
        `- forgelore/changes/${args.changeName}/specs/scenarios.md`,
        `- forgelore/changes/${args.changeName}/design.md`,
        `- forgelore/changes/${args.changeName}/tasks.md`,
        "",
        "Then review the actual implementation code referenced in design.",
        "For each requirement, check if it's met. Walk through each scenario.",
        "",
        "Report: PASS/FAIL/NEEDS_REVIEW verdict, per-requirement status, issues, suggestions.",
      ].join("\n");

      try {
        toolCtx.metadata({ title: `Validating ${args.changeName}...` });
        const result = await $`opencode run --model ${model} --agent forgelore-validator ${prompt}`
          .cwd(toolCtx.directory)
          .quiet();
        return `Validation complete.\n\n${result.text()}`;
      } catch (error: any) {
        return `Validator failed: ${error?.stderr?.toString?.() ?? String(error)}`;
      }
    },
  });

  return {
    "forgelore:run": run,
    "forgelore:status": status,
    "forgelore:build": build,
    "forgelore:validate": validate,
  };
}
