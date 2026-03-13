# Tasks: agent-model-selector

| ID | Task | Status | Category | Notes |
|----|------|--------|----------|-------|
| 1  | Add model selection prompts to setup.ts | done | cli | Rewrote with @clack/prompts. Each role gets a `p.note()` box showing agent name, description, recommendation, and default. `p.confirm()` accept-all-defaults shortcut (defaults to No). `p.autocomplete()` for searchable model selection when models are discovered. `p.text()` fallback with provider/model validation. Summary note at end. |
| 2  | Query available models from `opencode models` | done | cli | `execSync("opencode models")` with 10s timeout, parses `provider/model` lines. `p.spinner()` shows progress during discovery. Graceful fallback to text input on failure. |
| 3  | Inject selected models into agent frontmatter when writing to .opencode/agents/ | done | cli | `injectModel()` uses regex `^(model:\s*).+$` to replace the model line. Templates read from `agents/*.md`, injected content written to `.opencode/agents/*.md`. |
| 4  | Update betterspec:build tool to read model from agent file | done | plugin | `readModelFromAgent(directory, "betterspec-builder.md", fallback)` reads `.opencode/agents/betterspec-builder.md`, extracts `model:` from frontmatter via regex. Falls back to `anthropic/claude-sonnet-4-20250514` if file missing. `args.model` override still takes priority. |
| 5  | Update betterspec:validate tool to read model from agent file | done | plugin | Same pattern as Task 4 but reads `betterspec-validator.md`. Falls back to `anthropic/claude-sonnet-4-20250514`. |
| 6  | Test: non-interactive setup uses defaults | done | test | `process.stdin.isTTY && process.stdout.isTTY` check in `promptForModels()`. When false, all defaults applied silently — no prompts, no hangs. TypeScript type check and build both pass. |
