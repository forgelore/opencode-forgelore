# opencode-forgelore

**Multi-agent spec-driven development for [OpenCode](https://opencode.ai).**

An OpenCode plugin that connects [forgelore](https://github.com/DxVapor/forgelore)'s spec engine with OpenCode's multi-agent infrastructure. Spawns dedicated builder, validator, planner, and archivist agents — each in their own process with the right model for the job.

## The Golden Rule

> The agent that builds NEVER validates its own work.

Validators are always spawned via `opencode run` in a completely separate process — separate model, separate context, zero builder history. This ensures genuinely independent validation.

## Architecture

```
Orchestrator (main session, Opus)
  ├── Planner (Opus) ──────────> specs/requirements.md, design.md, tasks.md
  ├── Builder (configurable) ──> implements tasks from specs
  │     ├── frontend tasks ───> configurable model
  │     ├── backend tasks ────> configurable model
  │     └── infra tasks ──────> configurable model
  ├── Validator (Codex) ───────> clean context, verifies against specs
  └── Archivist (Sonnet) ─────> outcome.md, capability extraction
```

All background agents are spawned via `opencode run --model provider/model --agent name "prompt" --format json`, leveraging OpenCode's existing auth and provider routing.

## Install

```bash
# npm
npm install opencode-forgelore

# bun
bun add opencode-forgelore
```

Requires [`@forgelore/core`](https://github.com/DxVapor/forgelore) and [OpenCode](https://opencode.ai) as peer dependencies.

## Plugin Tools

| Tool | Description |
|------|-------------|
| `forgelore:build` | Dispatch a builder agent to implement tasks |
| `forgelore:validate` | Dispatch a validator with clean context |
| `forgelore:run` | Invoke any forgelore CLI command |

## Plugin Hooks

| Hook | Trigger | Action |
|------|---------|--------|
| `session.created` | New OpenCode session | Injects forgelore spec context |
| `file.edited` | File modification | Warns on unspecced edits |
| `session.idle` | Agent goes idle | Suggests next spec actions |

## Agents

Agent definitions live in `agents/` as markdown files with frontmatter:

| Agent | Model | Role |
|-------|-------|------|
| `forgelore-builder` | Sonnet | Implements tasks from specs |
| `forgelore-validator` | Codex | Independent validation (clean context) |
| `forgelore-planner` | Opus | Breaks proposals into specs and tasks |
| `forgelore-archivist` | Sonnet | Archives changes, extracts knowledge |

## Orchestration Modes

### Sequential
Tasks run one after another. Best for dependent work.

### Parallel
Independent tasks run simultaneously via `Promise.all` across multiple `opencode run` processes.

### Swarm
All agents active, coordinating through spec files as shared state. Each picks up tasks autonomously.

## Configuration

Orchestration settings live in `forgelore/forgelore.json`:

```json
{
  "orchestration": {
    "defaultMode": "sequential",
    "maxRetries": 3,
    "parallelTracks": 3
  },
  "enforcement": {
    "requireSpecForChanges": true,
    "warnOnUnspeccedEdits": true,
    "blockArchiveOnDrift": true,
    "autoInjectContext": true
  }
}
```

## Development

```bash
git clone https://github.com/DxVapor/opencode-forgelore.git
cd opencode-forgelore
bun install
bun run build
```

## License

MIT
