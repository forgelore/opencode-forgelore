# @forgelore/opencode

**Spec-driven development with multi-agent orchestration for [OpenCode](https://opencode.ai).**

Stop shipping code that drifts from what was agreed. This plugin brings structured specs, multi-model agent teams, and independent validation to your OpenCode workflow — so what gets built is what was planned.

## Install

```bash
bunx @forgelore/opencode
```

That's it. One command sets up everything:

1. Adds the plugin to your OpenCode config
2. Installs the [`@forgelore/cli`](https://github.com/forgelore/forgelore) CLI
3. Initializes forgelore in your project (specs, knowledge base, skills)
4. Copies agent definitions to `.opencode/agents/`

Start OpenCode and you're ready to go.

---

## Why This Exists

AI agents are great at writing code. They're terrible at remembering what they were supposed to build, checking their own work, and learning from past decisions.

**forgelore** solves the knowledge problem — it's a provider-agnostic spec engine that manages proposals, requirements, scenarios, designs, tasks, and a living knowledge base. No AI dependency. Just structured markdown and a CLI.

**@forgelore/opencode** solves the execution problem — it plugs forgelore into OpenCode's multi-agent infrastructure so agents actually follow specs, delegate to specialists, and get their work independently verified.

Together, they give you a development workflow where:

- Every change starts with a spec, not a vibe
- The knowledge base compounds across changes
- Implementation is traceable to requirements
- Validation is independent and honest

## Multi-Model Orchestration

OpenCode is provider-agnostic. This plugin takes full advantage of that.

Different parts of the development process have different needs. A planning task benefits from deep reasoning. A build task needs fast, accurate code generation. A validation task needs a fresh perspective — literally a different model that never saw the build process.

```
You (in OpenCode)
  │
  ├── Orchestrator ──────────── your main session model
  │     uses forgelore:status, forgelore:run to understand project state
  │
  ├── forgelore:build ─────────  spawns a Builder agent
  │     via `opencode run --model <your-choice> --agent forgelore-builder`
  │     reads specs, implements tasks, updates progress
  │
  └── forgelore:validate ──────  spawns a Validator agent
        via `opencode run --model <different-model> --agent forgelore-validator`
        clean context, zero build history, independent verification
```

Each agent runs in its own `opencode run` process. You choose the model per role. Want Opus for planning, Sonnet for building, and GPT for validation? Configure it. The orchestrator delegates, the specialists execute, and no single model is a bottleneck or a bias.

## The Golden Rule

> **The agent that builds NEVER validates its own work.**

This isn't a suggestion — it's the architecture. Validators are spawned via `opencode run` in a completely separate process with:

- A **different model** (configurable per role)
- **Zero builder context** — no conversation history, no build artifacts in memory
- **Only the specs and the code** — they read requirements, then review the implementation cold

This eliminates the most common failure mode in AI development: an agent convincing itself that its own output is correct. Independent validation catches what self-review misses.

## How It Works Under the Hood

### Forgelore: The Spec Engine

[forgelore](https://github.com/forgelore/forgelore) manages the structured knowledge layer:

```
forgelore/
├── forgelore.json                 # Config (mode, enforcement, orchestration)
├── changes/
│   └── add-auth/
│       ├── proposal.md            # The original idea
│       ├── specs/
│       │   ├── requirements.md    # What to build (functional + non-functional)
│       │   └── scenarios.md       # How it should work (happy path, edge cases)
│       ├── design.md              # Technical approach (files, APIs, patterns)
│       └── tasks.md               # Atomic task breakdown (assignable, traceable)
└── knowledge/
    ├── architecture.md            # System architecture (updated over time)
    ├── patterns.md                # Code patterns and conventions
    ├── glossary.md                # Domain terminology
    ├── capabilities/              # Extracted from completed changes (JSON)
    └── decisions/                 # Architecture decision records
```

The key insight: **knowledge compounds**. When a change is completed and archived, forgelore extracts capabilities, updates patterns, and feeds what was learned back into the knowledge base. The next agent session starts smarter than the last one.

### The Plugin: Bridging Specs to Agents

This plugin connects forgelore's spec engine to OpenCode through:

**Tools** — the orchestrator's interface to the spec system:

| Tool | What it does |
|------|--------------|
| `forgelore:run` | Run any CLI command (`status`, `propose`, `verify`, `diff`, etc.) |
| `forgelore:status` | Get structured data about all changes and task progress |
| `forgelore:build` | Spawn a builder agent to implement tasks from a spec |
| `forgelore:validate` | Spawn a validator with clean context to verify work |

**Hooks** — automatic behavior that keeps agents aligned:

| Hook | What it does |
|------|--------------|
| System prompt injection | Every LLM call gets current spec context — active changes, rules, suggestions |
| Unspecced edit warning | When an agent edits a file not referenced in any spec, it gets flagged |

**Agents** — specialized roles with tuned prompts:

| Agent | Default Model | Role |
|-------|---------------|------|
| `forgelore-planner` | Opus | Transforms proposals into specs, requirements, and task breakdowns |
| `forgelore-builder` | Sonnet | Implements tasks following specs and established patterns |
| `forgelore-validator` | Sonnet | Independent verification — clean context, no build history |
| `forgelore-archivist` | Sonnet | Archives completed changes, extracts capabilities to knowledge base |

## Workflow

```bash
# 1. Propose a change
forgelore propose "add user authentication"

# 2. Plan it (or use the planner agent)
#    Fill in requirements.md, scenarios.md, design.md, tasks.md

# 3. Verify the spec is complete
forgelore verify add-user-authentication

# 4. Build — the orchestrator dispatches builder agents
#    (via forgelore:build tool in OpenCode)

# 5. Validate — a separate agent reviews the work cold
#    (via forgelore:validate tool in OpenCode)

# 6. Archive — capture what was learned
forgelore archive add-user-authentication
```

## Configuration

Orchestration and enforcement settings live in `forgelore/forgelore.json`:

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

## Manual Setup

If you prefer to configure things yourself instead of running `bunx @forgelore/opencode`:

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

4. Copy agent definitions from this package's `agents/` directory to `.opencode/agents/` in your project.

## Development

```bash
git clone https://github.com/forgelore/opencode-forgelore.git
cd opencode-forgelore
bun install
bun run build
```

## License

MIT
