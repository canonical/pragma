# Getting Started with pragma

This guide walks you through installing pragma, configuring it for your project, and using it from the terminal and AI editors.

## Prerequisites

- [Bun](https://bun.sh) v1.2 or later
- Node.js v22 or later (for shell completions server)

## Installation

Install globally:

```bash
bun add -g @canonical/pragma
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
pragma standard lookup react/component/props
```

### Check modifiers and tokens

```bash
# List modifier families
pragma modifier list

# List design tokens
pragma token list

# Get token values across themes
pragma token lookup spacing-vertical-medium
```

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

```bash
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
pragma setup all
```

This configures MCP, installs shell completions, and symlinks skills.

## Undoing Changes

All setup and create commands support `--undo`:

```bash
pragma setup all --undo
pragma setup mcp --undo
pragma setup completions --undo
pragma create component Foo --undo
```

The undo interpreter walks the task tree from the original command and reverses each step.

## Diagnostics

Check your installation health:

```bash
# Run all checks
pragma doctor

# Show version and store info
pragma info

# Check for updates
pragma info upgrade
```

## LLM Orientation

Get a complete orientation document for AI agents:

```bash
pragma llm
```

This outputs decision trees for common intents and a command reference with token cost estimates. The MCP `llm` tool provides the same data structured for agents.
