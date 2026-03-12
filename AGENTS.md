# AGENTS.md — @forgelore/opencode

Instructions for AI agents working in this repository.

## Project Overview

@forgelore/opencode is an OpenCode plugin that connects forgelore's spec engine with OpenCode's multi-agent infrastructure. It provides tools and hooks that integrate into OpenCode's plugin API.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **Build**: tsup (ESM only, dual entry: index + setup)
- **Plugin SDK**: `@opencode-ai/plugin` (tools, hooks, types)
- **Spec engine**: `@forgelore/core` (peer dependency)

## Architecture

### Plugin entry (`src/index.ts`)
Default export is an async `Plugin` function matching OpenCode's `(PluginInput) => Promise<Hooks>` signature.

### Tools (`src/tools.ts`)
`createTools(ctx)` factory that closes over `PluginInput` for access to `ctx.$` (BunShell). Returns a record of `ToolDefinition` objects using the `tool()` helper with zod schemas. Each tool's `execute()` returns `Promise<string>`.

Tools: `forgelore:run`, `forgelore:status`, `forgelore:build`, `forgelore:validate`.

### Hooks (`src/hooks.ts`)
`createHooks(ctx)` factory returning partial `Hooks` object. Hooks:
- `experimental.chat.system.transform` — injects spec context into system prompt
- `tool.execute.after` — warns on unspecced file edits

### Setup CLI (`src/setup.ts`)
Standalone bin script for `bunx @forgelore/opencode`. Adds plugin to opencode.json, installs CLI, runs init, copies agents.

### Agents (`agents/`)
Markdown files with YAML frontmatter defining model, tools, temperature, and system instructions for OpenCode agents.

## The Golden Rule

The agent that builds NEVER validates its own work. `forgelore:validate` always spawns a fresh `opencode run` process with clean context.

## Key files

- `src/index.ts` — Plugin entry point (OpenCode Plugin API)
- `src/tools.ts` — Tool definitions (tool() + zod schemas)
- `src/hooks.ts` — Hook definitions (system prompt + edit warnings)
- `src/setup.ts` — bunx setup CLI
- `agents/forgelore-*.md` — Agent role definitions

## Building

```bash
bun install
bun run build
```
