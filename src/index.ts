/**
 * opencode-forgelore plugin
 * Connects forgelore's spec engine with OpenCode's multi-agent infrastructure.
 *
 * Setup: bunx opencode-forgelore
 * Config: add "opencode-forgelore" to plugin[] in opencode.json
 */

import type { Plugin } from "@opencode-ai/plugin";
import { createTools } from "./tools.js";
import { createHooks } from "./hooks.js";

const forgelorePlugin: Plugin = async (ctx) => {
  const tools = createTools(ctx);
  const hooks = await createHooks(ctx);

  return {
    tool: tools,
    ...hooks,
  };
};

export default forgelorePlugin;
