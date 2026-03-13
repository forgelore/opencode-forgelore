# Design: agent-model-selector

## Approach

Modify the setup script (`src/setup.ts`) to add an interactive model selection step between "Installing CLI" and "Setting up agents". The agent markdown files in `agents/` become templates with default models, and the setup script writes the final files to `.opencode/agents/` with the user's chosen model injected into the frontmatter.

Also update `src/tools.ts` so `betterspec:build` and `betterspec:validate` read the model from the agent files on disk instead of using hardcoded defaults.

## Key Decisions

1. **Templates, not overwrites**: The `agents/*.md` files in the package stay as-is (with default models) for documentation purposes. The setup script reads them, replaces the `model:` line via regex, and writes to `.opencode/agents/`.

2. **Prompt library**: Use `@clack/prompts` (v1.1.0) and `chalk` (v5.6.2) for a polished CLI GUI that matches the betterspec CLI style. This provides `autocomplete` for searchable model selection, `confirm` for the accept-all-defaults shortcut, `text` for free-text fallback, `note` for role context boxes, and `spinner` for model discovery.

3. **Model discovery is best-effort**: Try `opencode models` (via `execSync` with 10s timeout) to populate searchable autocomplete choices. Fall back to `p.text()` free-text input if discovery fails or returns no results.

4. **No config file for models**: Models live in the agent frontmatter. No separate config file. Users edit `.opencode/agents/*.md` to change models later.

5. **Role context before each prompt**: Each model prompt is preceded by a `p.note()` box showing the agent name, what it does, what kind of model is recommended, and the default. This makes it clear which agent you're configuring and why.

6. **Accept-all-defaults shortcut**: A `p.confirm()` ("Configure models for each agent role?", default No) lets users skip straight to defaults. Shows a summary note of defaults applied.

7. **readModelFromAgent() in tools.ts**: A shared helper reads `.opencode/agents/{agentFile}` frontmatter to extract the `model:` value at runtime. Both `betterspec:build` and `betterspec:validate` use it, falling back to hardcoded defaults if the file is missing.

## Files Modified

- `src/setup.ts` — rewrote model selection with `@clack/prompts` autocomplete, role context notes, confirm shortcut, spinner for discovery, frontmatter injection
- `src/tools.ts` — added `readModelFromAgent()` helper, updated `betterspec:build` and `betterspec:validate` to read model from agent files
- `agents/*.md` — no changes (they remain the defaults/templates)
- `package.json` — added `@clack/prompts` and `chalk` as dependencies

## Dependencies

- `@clack/prompts@^1.1.0` — interactive prompts (autocomplete, confirm, text, note, spinner)
- `chalk@^5.6.2` — terminal colors (Sedona theme: #CC5500, #F5A050, #7C3AED, #6B7280)
