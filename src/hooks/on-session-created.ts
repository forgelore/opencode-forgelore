/**
 * session.created hook
 * Inject forgelore spec context into new agent sessions
 *
 * When a new OpenCode session starts, this hook:
 * 1. Checks if forgelore is initialized in the project
 * 2. Reads active changes, knowledge base, and config
 * 3. Injects relevant context so the agent knows about specs
 */

import {
  configExists,
  readConfig,
  listChanges,
  readKnowledge,
  getForgeloreDir,
} from "@forgelore/core";

export async function onSessionCreated(ctx: {
  directory: string;
  session: any;
}): Promise<void> {
  const projectRoot = ctx.directory;

  // Only inject if forgelore is initialized
  if (!(await configExists(projectRoot))) {
    return;
  }

  const config = await readConfig(projectRoot);
  const changes = await listChanges(projectRoot, false);
  const knowledge = await readKnowledge(projectRoot);

  // Build context summary
  const contextLines: string[] = [
    "## Forgelore Context",
    "",
    `This project uses forgelore for spec-driven development.`,
    `Mode: ${config.mode}`,
    "",
  ];

  // Active changes
  if (changes.length > 0) {
    contextLines.push("### Active Changes");
    for (const change of changes) {
      contextLines.push(
        `- **${change.name}** (${change.status}) — see \`forgelore/changes/${change.name}/\``
      );
    }
    contextLines.push("");
  }

  // Knowledge highlights
  if (knowledge.capabilities.length > 0) {
    contextLines.push(
      `### Capabilities: ${knowledge.capabilities.length} registered`
    );
    contextLines.push(
      `See \`forgelore/knowledge/capabilities/\` for details.`
    );
    contextLines.push("");
  }

  // Enforcement reminders
  if (config.enforcement.requireSpecForChanges) {
    contextLines.push(
      "### Rules",
      "- Do NOT start coding without a spec. Run `forgelore propose` first.",
      "- Follow patterns in `forgelore/knowledge/patterns.md`.",
      "- Update task status as you work.",
      ""
    );
  }

  // Inject as system context (mechanism depends on OpenCode SDK)
  const context = contextLines.join("\n");

  // The exact injection method depends on OpenCode's plugin API
  // This will be refined once the SDK stabilizes
  if (ctx.session?.addContext) {
    await ctx.session.addContext(context);
  }
}
