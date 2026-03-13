/**
 * opencode-betterspec hooks
 * Maps betterspec behavior to real OpenCode hook points.
 *
 * Hooks:
 * - experimental.chat.system.transform — inject spec context into system prompt
 * - tool.execute.after — warn on unspecced file edits
 */

import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import {
  configExists,
  readConfig,
  listChanges,
  readKnowledge,
  readChangeFile,
  summarizeTasks,
} from "@betterspec/core";

export async function createHooks(
  ctx: PluginInput
): Promise<Partial<Hooks>> {
  return {
    /**
     * Inject betterspec spec context into the system prompt.
     * This runs before every LLM call, so agents always know about active specs.
     */
    "experimental.chat.system.transform": async (_input, output) => {
      const projectRoot = ctx.directory;

      if (!(await configExists(projectRoot))) {
        return;
      }

      try {
        const config = await readConfig(projectRoot);
        const changes = await listChanges(projectRoot, false);
        const knowledge = await readKnowledge(projectRoot);

        const lines: string[] = [
          "## Betterspec — Spec-Driven Development Context",
          "",
          `This project uses betterspec for spec-driven development (mode: ${config.mode}).`,
          "",
        ];

        // Active changes
        if (changes.length > 0) {
          lines.push("### Active Changes");
          for (const change of changes) {
            const tasks = summarizeTasks(change.tasks);
            lines.push(
              `- **${change.name}** [${change.status}] — ${tasks.passed}/${tasks.total} tasks passed — see \`betterspec/changes/${change.name}/\``
            );
          }
          lines.push("");
        }

        // Capabilities
        if (knowledge.capabilities.length > 0) {
          lines.push(
            `### Capabilities: ${knowledge.capabilities.length} registered`,
            "See `betterspec/knowledge/capabilities/` for details.",
            ""
          );
        }

        // Enforcement rules
        if (config.enforcement.requireSpecForChanges) {
          lines.push(
            "### Betterspec Rules",
            "- Do NOT start coding without a spec. Run `betterspec propose` first.",
            "- Follow patterns in `betterspec/knowledge/patterns.md`.",
            "- Use the `betterspec:run`, `betterspec:status`, `betterspec:build`, and `betterspec:validate` tools.",
            "- The agent that builds NEVER validates its own work.",
            ""
          );
        }

        // Idle suggestions (stale proposals, ready-to-archive)
        const suggestions: string[] = [];
        for (const change of changes) {
          const tasks = summarizeTasks(change.tasks);
          if (tasks.total > 0 && tasks.passed === tasks.total) {
            suggestions.push(
              `"${change.name}" has all tasks passed — consider archiving with \`betterspec archive ${change.name}\``
            );
          }
          const daysSinceUpdate = Math.floor(
            (Date.now() - new Date(change.updatedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (change.status === "proposed" && daysSinceUpdate > 3) {
            suggestions.push(
              `"${change.name}" has been proposed for ${daysSinceUpdate} days — run \`betterspec clarify ${change.name}\``
            );
          }
        }
        if (suggestions.length > 0) {
          lines.push(
            "### Suggestions",
            ...suggestions.map((s) => `- ${s}`),
            ""
          );
        }

        output.system.push(lines.join("\n"));
      } catch {
        // Silently skip if betterspec data can't be read
      }
    },

    /**
     * After a file-write tool executes, check if the edited file is covered
     * by an active spec. Warn in tool output metadata if not.
     */
    "tool.execute.after": async (input, output) => {
      // Only care about file-writing tools
      const writeTools = ["write", "edit", "file_write", "file_edit"];
      if (!writeTools.some((t) => input.tool.includes(t))) {
        return;
      }

      const projectRoot = ctx.directory;
      if (!(await configExists(projectRoot))) {
        return;
      }

      try {
        const config = await readConfig(projectRoot);
        if (!config.enforcement.warnOnUnspeccedEdits) {
          return;
        }

        // Try to extract the file path from the tool args
        const filePath: string | undefined =
          input.args?.filePath ?? input.args?.path ?? input.args?.file;
        if (!filePath || filePath.startsWith("betterspec/")) {
          return;
        }

        const changes = await listChanges(projectRoot, false);
        let covered = false;

        for (const change of changes) {
          try {
            const design = await readChangeFile(
              projectRoot,
              change.name,
              "design.md"
            );
            if (design.includes(filePath)) {
              covered = true;
              break;
            }
          } catch {
            // design.md might not exist
          }
        }

        if (!covered && changes.length > 0) {
          // Append warning to the tool output
          output.output += `\n\n[betterspec] Warning: "${filePath}" is not referenced in any active change's design.md. Consider running \`betterspec propose\` if this is new work.`;
        }
      } catch {
        // Silently skip
      }
    },
  };
}
