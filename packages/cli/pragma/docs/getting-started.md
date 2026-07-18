# Getting Started with pragma

This guide walks you through installing pragma, configuring it for your project, and using it from the terminal and AI editors.

## Prerequisites

- [Bun](https://bun.sh) v1.2 or later
- Node.js v22 or later (for shell completions server)

## Installation

Install globally:

```bash
bun add -g @canonical/pragma-cli
```

Verify the installation:

```bash
pragma --version
pragma doctor
```

`pragma doctor` checks that all dependencies are installed and the ke store can boot.

## Project Configuration

Create a `pragma.config.toml` in your project root to scope queries to your tier:

```toml
tier = "apps/lxd"
channel = "normal"
```

- **tier** — path in the tier hierarchy (e.g., `"apps/lxd"`, `"packages/design-system"`). Filters blocks to those visible at your tier.
- **channel** — release channel: `"normal"` (stable), `"experimental"`, or `"prerelease"`.

Without a config file, pragma shows all blocks across all tiers on the `normal` channel.

## Core Workflows

### Explore design system blocks

```bash
# List all blocks
pragma block list

# Get detailed info about a block
pragma block lookup Button

# Filter output for LLM consumption
pragma block lookup Button --llm

# Get JSON for programmatic use
pragma block list --format json
```

### Look up code standards

```bash
# List all standards
pragma standard list

# Filter by category
pragma standard list --category react

# Get a specific standard with code examples
pragma standard lookup react/component/props --detailed
```

### Check modifiers

```bash
# List modifier families
pragma modifier list

# Show a modifier family and its values
pragma modifier lookup Importance
```

> Token read commands (`token list`, `token lookup`) are currently disabled
> behind a feature flag while the design-system data does not yet ship token
> instances. `pragma tokens add-config` (Terrazzo config scaffolding) works
> today.

### Explore the knowledge graph

```bash
# List ontology namespaces
pragma ontology list

# Show classes and properties
pragma ontology show ds

# Run raw SPARQL queries
pragma graph query "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10"

# Inspect a specific URI
pragma graph inspect ds:global.component.button
```

### Discover agent skills

Skills are discovered from the git-referenced semantic packages, so fetch
them into the local cache first:

```bash
pragma update-refs
pragma skill list
```

Skills are Markdown files provided by `@canonical/design-system` and `@canonical/code-standards` that give AI agents domain-specific instructions.

## Output Modes

Every command supports three output modes:

| Mode | Flag | Use Case |
|------|------|----------|
| Plain | (default) | Terminal reading |
| LLM | `--llm` | Condensed Markdown for AI agents |
| JSON | `--format json` | Structured data for scripts |

```bash
pragma block list              # Plain table
pragma block list --llm        # Markdown summary
pragma block list --format json  # JSON array
```

## MCP Setup for AI Editors

pragma includes a built-in MCP server. Set it up for your editor:

```bash
# Auto-detect and configure
pragma setup mcp

# Or target a specific harness
pragma setup mcp --claude-code
pragma setup mcp --cursor
pragma setup mcp --windsurf
```

Preview changes first:

```bash
pragma setup mcp --dry-run
```

Reverse the setup:

```bash
pragma setup mcp --undo
```

See [mcp-integration.md](mcp-integration.md) for the complete MCP tool reference.

## Shell Completions

Install tab completions for your shell:

```bash
pragma setup completions
```

Supports bash, zsh, and fish. The completions server runs in the background and provides context-aware suggestions (block names, standard names, etc.).

## Agent Skills

Symlink agent skills into your harness configuration:

```bash
pragma setup skills
```

This makes design system and code standards skills available to your AI editor.

## Full Setup

Run all setup steps at once:

```bash
pragma setup
```

This installs shell completions, sets up the LSP, and configures MCP.

## Undoing Changes

All setup and create commands support `--undo`:

```bash
pragma setup --undo
pragma setup mcp --undo
pragma setup completions --undo
pragma create component react src/lib/Foo --undo
```

The undo interpreter walks the task tree from the original command and reverses each step.

## Diagnostics

Check your installation health:

```bash
# Run all checks
pragma doctor

# Show version and store info
pragma info

# Check for updates (and upgrade)
pragma upgrade --dry-run
```

## Agent Orientation

Mirror the MCP orientation payloads from the terminal:

```bash
pragma capabilities                     # live state: tier, channel, detail, packages
pragma capabilities --detail prompts    # the prompt catalog
pragma capabilities --detail reference  # the full tool reference
pragma prompt list                      # prompts with their arguments
pragma prompt lookup implement-component component=Button
```

`--format json` emits the exact protocol payloads (`pragma://state`,
`prompts/list`, `tools/list`, `prompts/get`). Over MCP, protocol-complete
clients get the same orientation natively — initialize `instructions`, the
`pragma://state` resource, and the prompts surface; tools-only harnesses call
the `capabilities` tool for everything in one aggregate.
