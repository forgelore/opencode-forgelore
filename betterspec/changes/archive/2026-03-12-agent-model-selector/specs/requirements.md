# Requirements: agent-model-selector

## Functional Requirements

1. **FR-1**: The setup script MUST prompt the user to select a model for each of the 4 agent roles (planner, builder, validator, archivist)
2. **FR-2**: Each role prompt MUST show a description of what the role does and what kind of model works best for it
3. **FR-3**: The setup script MUST offer a list of available models by querying `opencode models` or accepting free-text input
4. **FR-4**: Each role MUST have a sensible default model that is pre-selected
5. **FR-5**: The user MUST be able to accept all defaults at once (e.g. press Enter through all prompts, or a "use defaults" shortcut)
6. **FR-6**: The selected models MUST be written into the `model` field in each agent's YAML frontmatter in `.opencode/agents/`
7. **FR-7**: The `betterspec:build` and `betterspec:validate` tools in `src/tools.ts` MUST use the models from the agent files rather than hardcoded defaults

## Non-Functional Requirements

1. **NFR-1**: The setup must complete in under 30 seconds when accepting defaults
2. **NFR-2**: If `opencode models` is unavailable or fails, the setup MUST still work using manual text input
3. **NFR-3**: The setup MUST work non-interactively (no TTY) by silently using defaults
