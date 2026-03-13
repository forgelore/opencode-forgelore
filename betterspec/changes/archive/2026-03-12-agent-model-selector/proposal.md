# Proposal: Agent Model Selector during Setup

## Motivation

When running `bunx @betterspec/opencode`, the setup script currently hardcodes model choices in the agent frontmatter (Sonnet for builder/archivist, Opus for planner, Codex for validator). Users have different provider subscriptions, model preferences, and cost constraints. The models we picked may not even be available to them.

Users should be able to pick the provider/model for each agent role during the interactive setup, so the agent files written to `.opencode/agents/` reflect their actual environment.

## Scope

### In Scope

- Interactive model selection during `bunx @betterspec/opencode` setup
- Querying available models from OpenCode (`opencode models`)
- Writing user-selected models into agent frontmatter
- Sensible defaults when the user skips selection

### Out of Scope

- Changing models after initial setup (users can edit the .md files directly)
- Model-specific prompt tuning per provider
- Cost estimation or token budget tracking

## Context

- OpenCode provides `opencode models [provider]` to list available models
- Agent files use YAML frontmatter with a `model` field: `model: provider/model-id`
- The 4 agent roles have different needs: planner needs strong reasoning, builder needs code gen, validator needs independence, archivist needs summarization
- oh-my-openagent handles this via config overrides; we handle it at setup time

## Success Criteria

1. Running `bunx @betterspec/opencode` prompts the user to select models for each agent role
2. The generated `.opencode/agents/*.md` files contain the user's chosen models
3. Users can skip selection to use sensible defaults
4. The setup still works non-interactively (e.g. in CI) by falling back to defaults

---

*Proposed: 2026-03-12*
