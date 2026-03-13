# Outcome: agent-model-selector

## What Was Built

Interactive model selection for the `bunx @betterspec/opencode` setup CLI. Users can now choose which AI model powers each of the 4 agent roles (planner, builder, validator, archivist) instead of getting hardcoded defaults.

### Setup Flow (new steps 4-5)

1. **Model discovery** — queries `opencode models` with a spinner, parses available `provider/model` IDs
2. **Accept-all-defaults shortcut** — `p.confirm()` defaulting to No lets users skip straight to defaults
3. **Per-role selection** — for each role, a `p.note()` box shows the agent name, what it does, what kind of model is recommended, and the current default. `p.autocomplete()` provides searchable selection from discovered models, or `p.text()` for free-text input if discovery failed
4. **Summary** — a note box shows all selected models before writing
5. **Frontmatter injection** — templates from `agents/*.md` have their `model:` line replaced, then written to `.opencode/agents/`

### Tool Integration

`betterspec:build` and `betterspec:validate` now read the model from `.opencode/agents/betterspec-{role}.md` frontmatter at runtime via `readModelFromAgent()`, instead of using hardcoded defaults. The `args.model` override still takes priority, and missing files fall back gracefully.

## Files Changed

- `src/setup.ts` — rewrote step 4 (was plain copy, now model selection + injection), added step 5 (write agents), added `@clack/prompts` + `chalk` UI
- `src/tools.ts` — added `readModelFromAgent()` helper, updated `betterspec:build` and `betterspec:validate` execute functions
- `package.json` — added `@clack/prompts@^1.1.0` and `chalk@^5.6.2` as dependencies

## Capabilities Emerged

- **Searchable model autocomplete** — reusable pattern for any future CLI prompt that needs to select from a dynamic list
- **`readModelFromAgent()`** — generic frontmatter field reader, could be extended to read other agent config fields
- **Graceful degradation** — model discovery -> autocomplete -> text input -> defaults, each level falls back cleanly

## Lessons Learned

1. `@clack/prompts` v1.1.0 ships with `autocomplete` — no need to build custom search from raw readline
2. Role context (description + recommendation) before each prompt dramatically improves UX — users understand *why* they're choosing, not just *what*
3. The accept-all-defaults shortcut (defaulting to No/skip) respects users who just want to get started
4. Keeping models in agent frontmatter (not a separate config) means one source of truth — edit the .md file to change the model

## Patterns Established

- **Prompt-before-write**: Query available options, let user choose interactively, then write files with selections injected
- **Best-effort discovery**: Try to get data (`opencode models`), degrade gracefully, never block setup on failure
- **Template + injection**: Package ships templates with defaults, setup reads + transforms + writes to project
