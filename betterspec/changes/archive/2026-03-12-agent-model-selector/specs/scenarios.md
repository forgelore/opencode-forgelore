# Scenarios: agent-model-selector

## Happy Path

1. **User selects models interactively**: User runs `bunx @betterspec/opencode`. After plugin config and CLI install, they see 4 prompts — one per role. Each shows the role name, description, and a default. User picks models from a list or types a custom one. Agent files are written with chosen models.

2. **User accepts all defaults**: User runs `bunx @betterspec/opencode` and presses Enter through all 4 model prompts. Defaults are used (e.g. Sonnet for builder, Opus for planner). Agent files match defaults.

3. **User mixes defaults and custom**: User accepts default for planner and builder, but picks a different model for validator (e.g. `google/gemini-2.5-pro`). Only the validator agent file has a non-default model.

## Edge Cases

1. **No TTY (CI/scripting)**: Setup runs non-interactively (piped, no TTY). All prompts are skipped, defaults are used silently. No error, no hang.

2. **opencode models command fails**: The `opencode models` command returns an error or is not available. Setup falls back to showing defaults and accepting free-text input instead of a select list.

3. **User enters invalid model string**: User types a model ID that doesn't exist (e.g. `foo/bar`). Setup accepts it as-is — validation happens at runtime when OpenCode tries to use it, not at setup time.

4. **Re-running setup**: User runs `bunx @betterspec/opencode` again on a project that already has agent files. Existing agent files are overwritten with new model selections (current behavior for all setup steps).

## Error Cases

1. **opencode not installed**: If `opencode` CLI is not installed, the `opencode models` query fails gracefully and setup continues with text input + defaults.
