/**
 * opencode-betterspec plugin
 * Connects betterspec's spec engine with OpenCode's multi-agent infrastructure.
 *
 * Setup: bunx opencode-betterspec
 * Config: add "opencode-betterspec" to plugin[] in opencode.json
 */

import type { Plugin } from "@opencode-ai/plugin";
import { createTools } from "./tools.js";
import { createHooks } from "./hooks.js";

const betterspecPlugin: Plugin = async (ctx) => {
  const tools = createTools(ctx);
  const hooks = await createHooks(ctx);

  return {
    tool: tools,
    ...hooks,
  };
};

export default betterspecPlugin;
