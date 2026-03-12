/**
 * session.idle hook
 * Suggest next actions when the agent session goes idle
 *
 * Checks for:
 * - Changes ready for validation
 * - Stale proposals that need clarification
 * - Completed changes that should be archived
 */

import {
  configExists,
  listChanges,
  summarizeTasks,
} from "@forgelore/core";

export async function onSessionIdle(ctx: {
  directory: string;
  session?: any;
}): Promise<void> {
  const projectRoot = ctx.directory;

  if (!(await configExists(projectRoot))) {
    return;
  }

  const changes = await listChanges(projectRoot, false);
  if (changes.length === 0) {
    return;
  }

  const suggestions: string[] = [];

  for (const change of changes) {
    const tasks = summarizeTasks(change.tasks);

    // All tasks passed — suggest archiving
    if (tasks.total > 0 && tasks.passed === tasks.total) {
      suggestions.push(
        `Change "${change.name}" has all tasks passed. Consider running \`forgelore archive ${change.name}\`.`
      );
    }

    // Tasks implemented but not validated — suggest validation
    if (tasks.total > 0 && tasks.inProgress > 0) {
      const implementedCount = change.tasks.filter(
        (t) => t.status === "implemented"
      ).length;
      if (implementedCount > 0) {
        suggestions.push(
          `Change "${change.name}" has ${implementedCount} implemented task(s) awaiting validation.`
        );
      }
    }

    // Stale proposals
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(change.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (change.status === "proposed" && daysSinceUpdate > 3) {
      suggestions.push(
        `Change "${change.name}" has been proposed for ${daysSinceUpdate} days. Run \`forgelore clarify ${change.name}\` to refine it.`
      );
    }
  }

  if (suggestions.length > 0) {
    const message = [
      "[forgelore] Suggestions:",
      ...suggestions.map((s) => `  - ${s}`),
    ].join("\n");

    if (ctx.session?.suggest) {
      await ctx.session.suggest(message);
    }
  }
}
