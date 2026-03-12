# AGENTS.md — opencode-forgelore

Instructions for AI agents working in this repository.

## Project Overview

opencode-forgelore is an OpenCode plugin that connects forgelore's spec engine with OpenCode's multi-agent infrastructure. It spawns background agents via `opencode run` for building, validating, planning, and archiving.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **Build**: tsup (ESM only)
- **Dependencies**: `@forgelore/core` (peer), `opencode` (peer)

## Architecture

### Plugin entry
`src/plugin.ts` exports a default function returning `{ name, version, tools, hooks }`.

### Tools (`src/tools/`)
Each tool is an async function receiving `ctx` (with `$` shell and `directory`) and a typed request object. Tools spawn background agents via `opencode run`.

### Hooks (`src/hooks/`)
Each hook is an async function receiving `ctx` with session/file info. Hooks integrate with OpenCode's event system.

### Agents (`agents/`)
Markdown files with YAML frontmatter defining model, tools, temperature, and system instructions.

### Skills (`skills/`)
Markdown instruction files for the orchestrator role.

## The Golden Rule

The agent that builds NEVER validates its own work. `dispatch-validate.ts` always spawns a fresh `opencode run` process with a different model and zero builder context.

## Key files

- `src/plugin.ts` — Plugin entry point
- `src/tools/dispatch-build.ts` — Spawns builder agents
- `src/tools/dispatch-validate.ts` — Spawns validators (clean context)
- `src/tools/run-forgelore.ts` — Invokes forgelore CLI
- `src/hooks/on-session-created.ts` — Injects spec context
- `src/hooks/on-file-edited.ts` — Warns on unspecced edits
- `src/hooks/on-session-idle.ts` — Suggests next actions
- `agents/forgelore-*.md` — Agent role definitions

## Building

```bash
bun install
bun run build
```

Note: `@forgelore/core` is a peer dependency. DTS generation is disabled until core is published to npm.
