/**
 * forgelore:validate tool
 * Dispatch a validation agent with CLEAN CONTEXT
 *
 * GOLDEN RULE: The agent that builds NEVER validates its own work.
 * Validators are always spawned with a fresh process via `opencode run`
 * — separate process, separate model, zero builder history.
 */

export interface ValidateRequest {
  changeName: string;
  model?: string; // override validation model
}

export interface ValidationResult {
  verdict: "PASS" | "FAIL" | "NEEDS_REVIEW";
  confidence: number;
  requirements: Array<{
    requirement: string;
    status: "pass" | "fail" | "partial";
    evidence?: string;
    reason?: string;
  }>;
  issues: string[];
  suggestions: string[];
}

/**
 * Dispatch a validator to verify implementation against specs
 * Runs in a completely separate process with clean context
 */
export async function dispatchValidate(
  ctx: {
    $: any;
    directory: string;
  },
  request: ValidateRequest
): Promise<ValidationResult> {
  const { changeName, model } = request;
  const resolvedModel = model ?? "openai/codex";

  const prompt = buildValidationPrompt(changeName);

  // Spawn validator — MUST be a fresh session with no builder context
  const cmd = [
    "opencode",
    "run",
    "--model",
    resolvedModel,
    "--agent",
    "forgelore-validator",
    "--format",
    "json",
    JSON.stringify(prompt),
  ];

  try {
    const result = await ctx.$.raw`${cmd.join(" ")}`;
    const output = JSON.parse(result.stdout.toString()) as ValidationResult;

    // Validate the output structure
    if (!output.verdict || !output.requirements) {
      return {
        verdict: "NEEDS_REVIEW",
        confidence: 0,
        requirements: [],
        issues: ["Validator returned invalid output format"],
        suggestions: ["Re-run validation with a different model"],
      };
    }

    return output;
  } catch (error) {
    return {
      verdict: "NEEDS_REVIEW",
      confidence: 0,
      requirements: [],
      issues: [
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
      suggestions: ["Check validator agent configuration and try again"],
    };
  }
}

/**
 * Build the validation prompt — includes only specs, no build history
 */
function buildValidationPrompt(changeName: string): string {
  return [
    `You are a VALIDATION AGENT. You have NOT seen the build process.`,
    `Your job is to independently verify that the implementation matches the specs.`,
    ``,
    `Validate change: "${changeName}"`,
    ``,
    `Read these files:`,
    `- forgelore/changes/${changeName}/specs/requirements.md`,
    `- forgelore/changes/${changeName}/specs/scenarios.md`,
    `- forgelore/changes/${changeName}/design.md`,
    `- forgelore/changes/${changeName}/tasks.md`,
    ``,
    `Then review the actual implementation code.`,
    ``,
    `For each requirement, check if it's met by the code.`,
    `Walk through each scenario and verify it works.`,
    ``,
    `Return a JSON ValidationResult:`,
    `{`,
    `  "verdict": "PASS" | "FAIL" | "NEEDS_REVIEW",`,
    `  "confidence": 0-100,`,
    `  "requirements": [{ "requirement": "...", "status": "pass|fail|partial", "evidence": "...", "reason": "..." }],`,
    `  "issues": ["..."],`,
    `  "suggestions": ["..."]`,
    `}`,
  ].join("\n");
}
