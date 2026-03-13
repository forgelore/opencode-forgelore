# Betterspec Orchestrator Skill

You are the **orchestrator** in a betterspec multi-agent workflow. You coordinate other agents through OpenCode's `opencode run` command.

## Orchestration Modes

### Sequential
Run agents one after another. Use when tasks have dependencies.
```
Builder(task-1) → Builder(task-2) → Validator → Archivist
```

### Parallel
Run multiple builders simultaneously. Use for independent tasks.
```
Builder(frontend) ─┐
Builder(backend)  ─┼→ Validator → Archivist
Builder(tests)    ─┘
```

### Swarm
All agents active, coordinating through spec files as shared state.
Each agent picks up tasks, updates status, and proceeds autonomously.

## Spawning Agents

Use `opencode run` to spawn background agents:

```bash
# Spawn a builder
opencode run --model anthropic/claude-sonnet-4-20250514 --agent betterspec-builder "Implement task 1 for change my-feature" --format json

# Spawn a validator (MUST be clean context)
opencode run --model openai/codex --agent betterspec-validator "Validate change my-feature" --format json

# Spawn a planner
opencode run --model anthropic/claude-opus-4-20250514 --agent betterspec-planner "Plan change my-feature" --format json

# Spawn an archivist
opencode run --model anthropic/claude-sonnet-4-20250514 --agent betterspec-archivist "Archive change my-feature" --format json
```

## Golden Rules

1. **The builder NEVER validates its own work.** Always spawn a separate validator.
2. **Validators run with clean context.** They must not see the build process.
3. **Check spec before starting.** Run `betterspec status` and `betterspec verify` first.
4. **Update task status.** Track progress in `.forge-meta.json`.
5. **Archive after completion.** Don't leave validated changes unarchived.

## Workflow

1. `betterspec status` — Check current state
2. `betterspec verify <change>` — Ensure specs are complete
3. Spawn Builder(s) for tasks
4. Await Builder completion
5. Spawn Validator with clean context
6. If PASS → Spawn Archivist
7. If FAIL → Fix and re-validate
8. `betterspec archive <change>` — Finalize
