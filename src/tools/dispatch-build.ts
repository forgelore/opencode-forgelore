/**
 * forgelore:build tool
 * Dispatch a builder agent via `opencode run` to implement tasks
 *
 * The builder runs in a separate process with its own model/agent config.
 * The orchestrator awaits the result.
 */

export interface BuildRequest {
  changeName: string;
  taskIds: string[];
  category?: string; // frontend, backend, infra — for model routing
  model?: string; // override: provider/model
  agent?: string; // override: agent name
}

export interface BuildResult {
  success: boolean;
  taskIds: string[];
  filesChanged: string[];
  summary: string;
  errors?: string[];
}

/**
 * Dispatch a build agent to implement specified tasks
 */
export async function dispatchBuild(
  ctx: {
    $: any; // Bun shell from plugin context
    directory: string;
  },
  request: BuildRequest
): Promise<BuildResult> {
  const { changeName, taskIds, category, model, agent } = request;

  // Resolve model — category-based routing if no explicit override
  const resolvedModel = model ?? resolveModelForCategory(category);
  const resolvedAgent = agent ?? "forgelore-builder";

  // Build the prompt with spec context
  const prompt = buildPrompt(changeName, taskIds, ctx.directory);

  // Spawn builder via opencode run
  const cmd = [
    "opencode",
    "run",
    "--model",
    resolvedModel,
    "--agent",
    resolvedAgent,
    "--format",
    "json",
    JSON.stringify(prompt),
  ];

  try {
    const result = await ctx.$.raw`${cmd.join(" ")}`;
    const output = JSON.parse(result.stdout.toString());

    return {
      success: true,
      taskIds,
      filesChanged: output.filesChanged ?? [],
      summary: output.summary ?? "Build completed",
    };
  } catch (error) {
    return {
      success: false,
      taskIds,
      filesChanged: [],
      summary: "Build failed",
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Route to different models based on task category
 */
function resolveModelForCategory(category?: string): string {
  // Default routing — can be overridden via forgelore config
  switch (category) {
    case "frontend":
      return "anthropic/claude-sonnet-4-20250514";
    case "backend":
      return "anthropic/claude-sonnet-4-20250514";
    case "infra":
      return "anthropic/claude-sonnet-4-20250514";
    default:
      return "anthropic/claude-sonnet-4-20250514";
  }
}

/**
 * Build a structured prompt for the builder agent
 */
function buildPrompt(
  changeName: string,
  taskIds: string[],
  projectDir: string
): string {
  return [
    `You are implementing tasks for change "${changeName}".`,
    ``,
    `Tasks to complete: ${taskIds.join(", ")}`,
    ``,
    `Read the spec files:`,
    `- forgelore/changes/${changeName}/specs/requirements.md`,
    `- forgelore/changes/${changeName}/specs/scenarios.md`,
    `- forgelore/changes/${changeName}/design.md`,
    `- forgelore/changes/${changeName}/tasks.md`,
    ``,
    `Follow the established patterns in forgelore/knowledge/patterns.md.`,
    `Update task status as you complete each task.`,
    ``,
    `Return JSON: { "filesChanged": [...], "summary": "..." }`,
  ].join("\n");
}
