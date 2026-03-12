/**
 * file.edited hook
 * Warn when files are edited that aren't covered by an active spec
 *
 * This is an enforcement layer — when spec enforcement is enabled,
 * editing files outside of a tracked change triggers a warning.
 */

import {
  configExists,
  readConfig,
  listChanges,
  readChangeFile,
} from "@forgelore/core";

export async function onFileEdited(ctx: {
  directory: string;
  file: string;
  session?: any;
}): Promise<void> {
  const projectRoot = ctx.directory;

  // Skip if not initialized
  if (!(await configExists(projectRoot))) {
    return;
  }

  const config = await readConfig(projectRoot);

  // Skip if enforcement is disabled
  if (!config.enforcement.warnOnUnspeccedEdits) {
    return;
  }

  // Skip forgelore internal files
  if (ctx.file.startsWith("forgelore/")) {
    return;
  }

  // Check if this file is covered by any active change's design.md
  const changes = await listChanges(projectRoot, false);
  let covered = false;

  for (const change of changes) {
    try {
      const design = await readChangeFile(projectRoot, change.name, "design.md");
      // Simple heuristic: check if the file path appears in design.md
      if (design.includes(ctx.file)) {
        covered = true;
        break;
      }
    } catch {
      // design.md might not exist or be readable
    }
  }

  if (!covered && changes.length > 0) {
    // File is being edited but isn't referenced in any spec
    const warning = [
      `[forgelore] Unspecced edit detected: ${ctx.file}`,
      `This file is not referenced in any active change's design.md.`,
      `Consider running \`forgelore propose\` if this is a new feature,`,
      `or updating the relevant change's design.md.`,
    ].join("\n");

    // Emit warning through OpenCode's plugin system
    if (ctx.session?.warn) {
      await ctx.session.warn(warning);
    }
  }
}
