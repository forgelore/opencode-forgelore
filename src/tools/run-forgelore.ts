/**
 * forgelore:run tool
 * Invoke forgelore CLI commands from within OpenCode
 */

export interface RunForgeloreRequest {
  command: string; // e.g. "status", "propose 'add auth'", "verify my-change"
}

export interface RunForgeloreResult {
  success: boolean;
  output: string;
  exitCode: number;
}

/**
 * Run a forgelore CLI command and return the output
 */
export async function runForgelore(
  ctx: {
    $: any;
    directory: string;
  },
  request: RunForgeloreRequest
): Promise<RunForgeloreResult> {
  const { command } = request;

  try {
    const result = await ctx.$.raw`forgelore ${command}`;
    return {
      success: true,
      output: result.stdout.toString(),
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.stderr?.toString() ?? error.message ?? String(error),
      exitCode: error.exitCode ?? 1,
    };
  }
}
