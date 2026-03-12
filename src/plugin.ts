/**
 * opencode-forgelore plugin
 * Connects forgelore's spec engine with OpenCode's multi-agent infrastructure
 *
 * Architecture:
 * - Orchestrator (main session, Opus) holds context
 * - Background agents spawned via `opencode run --model X --agent Y "prompt"`
 * - The agent that builds NEVER validates its own work
 * - Validators run in clean context (separate process, separate model)
 */

import { dispatchBuild } from "./tools/dispatch-build.js";
import { dispatchValidate } from "./tools/dispatch-validate.js";
import { runForgelore } from "./tools/run-forgelore.js";
import { onSessionCreated } from "./hooks/on-session-created.js";
import { onFileEdited } from "./hooks/on-file-edited.js";
import { onSessionIdle } from "./hooks/on-session-idle.js";

/**
 * Plugin definition for OpenCode
 */
export default function forgelorePlugin() {
  return {
    name: "forgelore",
    version: "0.1.0",

    tools: {
      "forgelore:build": dispatchBuild,
      "forgelore:validate": dispatchValidate,
      "forgelore:run": runForgelore,
    },

    hooks: {
      "session.created": onSessionCreated,
      "file.edited": onFileEdited,
      "session.idle": onSessionIdle,
    },
  };
}
