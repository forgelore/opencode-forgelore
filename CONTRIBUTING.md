# Contributing to @betterspec/opencode

Thank you for your interest in contributing to the OpenCode plugin for betterspec! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, constructive, and inclusive. We're building tools for collaborative development — let's model that in how we work together.

## How to Contribute

### Reporting Issues

- Use [GitHub Issues](https://github.com/betterspec/opencode-betterspec/issues) to report bugs or request features
- Check existing issues before creating a new one
- Include reproduction steps, expected behavior, and actual behavior for bug reports
- Note your OpenCode version and plugin version

### Pull Requests

All changes to `main` must come through pull requests. Direct pushes to `main` are not allowed.

1. **Fork the repository** and create a branch from `main`
2. **Name your branch** descriptively: `feat/your-feature`, `fix/bug-description`, `docs/what-changed`
3. **Make your changes** following the guidelines below
4. **Test your changes** — run `bun run build` to verify the build passes
5. **Submit a pull request** with a clear description of what and why

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/opencode-betterspec.git
cd opencode-betterspec

# Install dependencies
bun install

# Build
bun run build

# Type check
bunx tsc --noEmit
```

### Project Structure

- `src/index.ts` — Plugin entry point (OpenCode Plugin API)
- `src/tools.ts` — Tool definitions (`betterspec:run`, `betterspec:status`, `betterspec:build`, `betterspec:validate`)
- `src/hooks.ts` — Hook definitions (system prompt injection, unspecced edit warnings)
- `src/setup.ts` — Setup CLI (`bunx @betterspec/opencode`)
- `agents/` — Agent templates (planner, builder, validator, archivist)

### Code Guidelines

- **Language**: TypeScript (strict mode)
- **Runtime**: Bun
- **Build**: tsup (ESM only, dual entry: index + setup)
- **Plugin SDK**: `@opencode-ai/plugin` — tools use `tool()` helper with zod schemas
- **Style**: Follow existing patterns in the codebase
- **Commits**: Use conventional commit messages (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)

### The Golden Rule

The agent that builds NEVER validates its own work. `betterspec:validate` always spawns a fresh process with clean context. Preserve this separation in any changes to the tool system.

### Spec-Driven Development

This project dogfoods betterspec. For significant changes:

1. Run `betterspec propose "your idea"` to create a change spec
2. Fill in requirements, scenarios, design, and tasks
3. Implement from the spec
4. Archive when done with `betterspec archive <change-name>`

### Agent Definitions

When modifying agent files in `agents/`:

- Keep YAML frontmatter tools as a **record** format (`read: true`), not array format (`- read`)
- The `model:` field in templates serves as the default — users override it during setup
- Test that `bunx @betterspec/opencode` correctly copies and transforms the agents

## Questions?

Open a [discussion](https://github.com/betterspec/opencode-betterspec/discussions) or an issue. We're happy to help.
