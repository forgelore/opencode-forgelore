# @forgelore/opencode

**Multi-agent spec-driven development for [OpenCode](https://opencode.ai).**

An OpenCode plugin that connects [forgelore](https://github.com/DxVapor/forgelore)'s spec engine with OpenCode's multi-agent infrastructure. Spawns dedicated builder, validator, planner, and archivist agents — each in their own process with the right model for the job.

## Quick Setup

One command does everything:

```bash
bunx @forgelore/opencode
```

This will:
1. Add `@forgelore/opencode` to your OpenCode plugin config
2. Install the `@forgelore/cli` CLI globally
3. Run `forgelore init` to scaffold specs and skills in your project
4. Copy agent definitions to `.opencode/agents/`

That's it. Open `opencode` and start working.

### Manual Setup

If you prefer to set things up yourself:

1. Add the plugin to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "@forgelore/opencode"
  ]
}
```

2. Install the forgelore CLI:

```bash
bun i -g @forgelore/cli
```

3. Initialize forgelore in your project:

```bash
forgelore init
```

4. Copy the agent definitions from this package's `agents/` directory to `.opencode/agents/` in your project.

## The Golden Rule

> The agent that builds NEVER validates its own work.

Validators are always spawned via `opencode run` in a completely separate process — separate model, separate context, zero builder history.

## Architecture

```
Orchestrator (main session)
  ├── forgelore:status ────────> structured spec overview
  ├── forgelore:run ───────────> invoke any CLI command
  ├── forgelore:build ─────────> spawn builder agent for tasks
  └── forgelore:validate ──────> spawn validator (clean context)
```

Background agents are spawned via `opencode run`, leveraging OpenCode's existing auth and provider routing.

## Plugin Tools

| Tool | Description |
|------|-------------|
| `forgelore:run` | Invoke any forgelore CLI command |
| `forgelore:status` | Structured overview of all changes and progress |
| `forgelore:build` | Dispatch a builder agent to implement tasks |
| `forgelore:validate` | Dispatch a validator with clean context |

## Plugin Hooks

| Hook | When | What |
|------|------|------|
| System prompt injection | Every LLM call | Injects active specs, rules, and suggestions |
| Unspecced edit warning | After file writes | Warns when edited files aren't in any spec's design.md |

## Agents

Agent definitions are copied to `.opencode/agents/` during setup:

| Agent | Default Model | Role |
|-------|---------------|------|
| `forgelore-builder` | Sonnet | Implements tasks from specs |
| `forgelore-validator` | Sonnet | Independent validation (clean context) |
| `forgelore-planner` | Opus | Breaks proposals into specs and tasks |
| `forgelore-archivist` | Sonnet | Archives changes, extracts knowledge |

## Workflow

```
forgelore propose "add auth"     # Create a spec
forgelore verify add-auth        # Check spec completeness
# Use forgelore:build tool       # Dispatch builder agents
# Use forgelore:validate tool    # Independent validation
forgelore archive add-auth       # Capture knowledge
```

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
git clone https://github.com/DxVapor/@forgelore/opencode.git
cd @forgelore/opencode
bun install
bun run build
```

## License

MIT
