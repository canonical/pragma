# @canonical/pragma

CLI and MCP server for Canonical's design system. Query blocks, standards, modifiers, tokens, tiers, ontologies, and skills from the terminal or your AI editor.

## Installation

```bash
bun add -g @canonical/pragma
```

## Quick Start

```bash
pragma --help                     # Show all commands
pragma block list                 # List design system blocks
pragma block lookup Button        # Detailed block info
pragma standard list              # List code standards
pragma setup mcp                  # Configure MCP for your editor
```

See [docs/getting-started.md](docs/getting-started.md) for a full walkthrough.

## CLI Commands

pragma organizes commands into 14 domains. Every command supports three output modes: plain text (default), `--llm` (condensed Markdown), and `--format json` (structured JSON).

### Block

| Command | Description |
|---------|-------------|
| `pragma block list` | List all blocks (components) visible under current tier/channel |
| `pragma block lookup <name>` | Show detailed block info: anatomy, modifiers, tokens, standards |

### Standard

| Command | Description |
|---------|-------------|
| `pragma standard list` | List all code standards |
| `pragma standard lookup <name>` | Show standard with do/don't examples |
| `pragma standard categories` | List standard categories with counts |

### Modifier

| Command | Description |
|---------|-------------|
| `pragma modifier list` | List all modifier families |
| `pragma modifier lookup <name>` | Show modifier family with values |

### Token

| Command | Description |
|---------|-------------|
| `pragma token list` | List all design tokens |
| `pragma token lookup <name>` | Show token with theme values |
| `pragma token add-config` | Add Terrazzo config for token build |

### Tier

| Command | Description |
|---------|-------------|
| `pragma tier list` | List all tiers in the tier hierarchy |

### Ontology

| Command | Description |
|---------|-------------|
| `pragma ontology list` | List loaded ontology namespaces |
| `pragma ontology show <prefix>` | Show classes and properties for a namespace |

### Graph

| Command | Description |
|---------|-------------|
| `pragma graph query <sparql>` | Execute a raw SPARQL query against the ke store |
| `pragma graph inspect <uri>` | Inspect all triples for a given URI |

### Config

| Command | Description |
|---------|-------------|
| `pragma config show` | Show current configuration (tier, channel) |
| `pragma config tier <path>` | Set the project's tier |
| `pragma config channel <name>` | Set the release channel |

### Skill

| Command | Description |
|---------|-------------|
| `pragma skill list` | List discovered agent skills from installed packages |

### LLM

| Command | Description |
|---------|-------------|
| `pragma llm` | Print LLM orientation context (decision trees, command reference) |

### Setup

All setup commands support `--dry-run`, `--yes`, and `--undo`.

| Command | Description |
|---------|-------------|
| `pragma setup all` | Run all setup steps (MCP + completions + skills) |
| `pragma setup mcp` | Configure pragma MCP server for AI harnesses |
| `pragma setup completions` | Install shell completions (bash/zsh/fish) |
| `pragma setup skills` | Symlink agent skills into harness config |
| `pragma setup lsp` | Configure LSP integration |

### Create

Create commands scaffold new code using summon generators. They support `--undo` to reverse.

| Command | Description |
|---------|-------------|
| `pragma create component <name>` | Scaffold a new design system component |
| `pragma create package <name>` | Scaffold a new monorepo package |

### Doctor

| Command | Description |
|---------|-------------|
| `pragma doctor` | Run diagnostic checks on your pragma installation |

### Info

| Command | Description |
|---------|-------------|
| `pragma info` | Show pragma version, store summary, installed packages |
| `pragma info upgrade` | Check for newer pragma versions on the registry |

## Global Flags

| Flag | Description |
|------|-------------|
| `--llm` | Condensed Markdown output for LLM consumption |
| `--format json` | Structured JSON output |
| `--verbose` | Diagnostic output to stderr |

## The `--undo` Flag

Setup and create commands support `--undo` to reverse previous operations. The undo interpreter walks the task tree produced by the original command, collects all registered undo steps, and executes them in reverse order.

```bash
pragma setup mcp --undo             # Remove MCP configuration
pragma setup completions --undo     # Remove shell completions
pragma create component Foo --undo  # Remove scaffolded component files
```

## MCP Integration

pragma ships a built-in MCP server accessible via `pragma mcp` (stdio transport). See [docs/mcp-integration.md](docs/mcp-integration.md) for the complete integration guide.

### Setup

```bash
pragma setup mcp                 # Auto-detect harness and configure
pragma setup mcp --claude-code   # Configure for Claude Code only
pragma setup mcp --cursor        # Configure for Cursor only
pragma setup mcp --windsurf      # Configure for Windsurf only
```

Or add manually to your `.mcp.json`:

```json
{
  "mcpServers": {
    "pragma": {
      "command": "pragma",
      "args": ["mcp"],
      "type": "stdio"
    }
  }
}
```

### MCP Tools (29)

All tools return a consistent envelope: `{ ok: true, data, meta }` for success, `{ ok: true, condensed: true, text, tokens }` for condensed mode, or `{ ok: false, error }` with structured recovery on failure.

#### Read Tools (20)

| Tool | Description |
|------|-------------|
| `block_list` | List blocks with optional tier filtering and disclosure levels |
| `block_lookup` | Look up detailed block info (anatomy, modifiers, tokens, standards) |
| `block_batch_lookup` | Look up multiple blocks by name in a single call |
| `standard_list` | List code standards with optional category/search filtering |
| `standard_lookup` | Look up standard with do/don't code examples |
| `standard_batch_lookup` | Look up multiple standards by name in a single call |
| `standard_categories` | List standard categories with counts |
| `modifier_list` | List modifier families |
| `modifier_lookup` | Look up modifier family with values |
| `modifier_batch_lookup` | Look up multiple modifier families by name in a single call |
| `token_list` | List design tokens with optional category filtering |
| `token_lookup` | Look up token with theme-resolved values |
| `token_batch_lookup` | Look up multiple tokens by name in a single call |
| `tier_list` | List all tiers in the hierarchy |
| `config_show` | Show current tier and channel configuration |
| `ontology_list` | List loaded ontology namespaces with class/property counts |
| `ontology_show` | Show classes and properties for a namespace |
| `graph_query` | Execute raw SPARQL against the ke store |
| `graph_inspect` | Inspect all triples for a URI |
| `skill_list` | List discovered agent skills |

#### Write Tools (5)

| Tool | Description |
|------|-------------|
| `config_tier` | Set the project's tier |
| `config_channel` | Set the release channel |
| `tokens_add_config` | Add Terrazzo token build configuration |
| `create_component` | Scaffold a new design system component |
| `create_package` | Scaffold a new monorepo package |

#### Orientation Tools (2)

| Tool | Description |
|------|-------------|
| `capabilities` | List all available tools with category counts (~100 tokens) |
| `llm` | Get full LLM orientation: context, decision trees, command reference |

#### Diagnostic Tools (2)

| Tool | Description |
|------|-------------|
| `doctor` | Run installation diagnostic checks |
| `info` | Show version, store summary, installed packages |

### Envelope Format

Every MCP tool response is wrapped by `wrapTool` into one of three envelopes:

**Success (structured):**
```json
{ "ok": true, "data": { ... }, "meta": { "count": 42, "filters": {} } }
```

**Success (condensed):**
```json
{ "ok": true, "condensed": true, "text": "...", "tokens": "~1.2k" }
```

**Error (structured recovery):**
```json
{
  "ok": false,
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "block \"Buton\" not found.",
    "suggestions": ["Button", "ButtonGroup"],
    "recovery": { "tool": "block_list" }
  }
}
```

### Disclosure Levels

List tools support disclosure levels that control response verbosity:

- **summary** (default) — names and metadata only
- **digest** — summary plus implementation paths and key details
- **detailed** — full entity data including anatomy, tokens, and standards

### Condensed Mode

Pass `condensed: true` to any read tool to receive token-optimized Markdown instead of structured JSON. The condensed output reuses the `--llm` formatter, keeping responses compact for token-budgeted agents.

### Structured Recovery

Error responses include a `recovery` object that tells agents what tool to call next:

```json
{
  "recovery": {
    "tool": "block_list",
    "params": { "names": ["Button"] }
  }
}
```

### Batch Results

List tools that accept a `names` filter return partial results — valid items in `results`, failures in `errors`:

```json
{
  "results": [{ "name": "Button", ... }],
  "errors": [{ "name": "Buton", "code": "ENTITY_NOT_FOUND", "message": "..." }]
}
```

### MCP Resources

Every subject URI in the ke graph is exposed as a discoverable MCP resource via the `pragma:{uri}` template. Reading a resource returns all properties with level-1 object relations resolved to summaries.

## Configuration

Create a `pragma.config.toml` in your project root:

```toml
tier = "apps/lxd"
channel = "normal"    # normal | experimental | prerelease
```

When no config file is present, pragma defaults to no tier and `normal` channel.

## Error Handling

Errors follow a three-part structure: message, context (suggestions or valid options), and recovery hint.

```
Error: block "Buton" not found.

Did you mean?
  - Button
  - ButtonGroup

Run `pragma block list`
```

With `--format json`, errors are returned as structured JSON with error code, suggestions, and recovery. With `--llm`, errors are rendered as Markdown.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Entity not found |
| 2 | Empty results |
| 3 | Invalid or ambiguous input |
| 4 | Configuration error |
| 5 | Store error |
| 127 | Internal error |

## Architecture

pragma is structured as a domain-driven application using the federation pattern from `@canonical/cli-core`:

1. **Domains** — 14 domain modules (block, standard, modifier, token, tier, ontology, graph, config, skill, llm, setup, create, doctor, info), each exporting `CommandDefinition[]`
2. **Operations** — data retrieval functions that query the ke triple store via SPARQL
3. **Formatters** — three-mode output adapters (plain/llm/json) for each operation
4. **Commands** — thin wiring layer connecting Commander.js parameters to operations + formatters
5. **MCP tools** — parallel surface that reuses the same operations, with `wrapTool` envelope construction
6. **Pipeline** — `runCli` orchestrates boot, flag parsing, command resolution, and program execution

The ke store (Oxigraph WASM) holds RDF data from three packages: `@canonical/design-system` (ontology + component data), `@canonical/code-standards` (standard definitions + examples), and `@canonical/anatomy-dsl` (anatomy definitions).

## Scripts

```bash
bun run check          # biome + tsc + webarchitect
bun run test           # vitest
bun run build:compile  # bun build --compile (produces dist/pragma)
bun run test:compile   # WASM embedding validation
```

## Compiled Binary

pragma targets a compiled single-file executable via `bun build --compile`. The Oxigraph WASM module embeds automatically — no manual embedding or side-loading required.

```bash
bun build --compile --minify src/bin.ts --outfile dist/pragma
```

## Dependencies

- [`@canonical/ke`](../runtime/ke/) — triple store runtime (Oxigraph WASM)
- [`@canonical/cli-core`](../core/) — shared CLI machinery (Commander.js registration, help formatting)
- [`@canonical/task`](../../lib/task/) — reversible task trees for setup/create with undo support
- [`@canonical/harnesses`](../../lib/harnesses/) — AI harness detection (Claude Code, Cursor, Windsurf)
- [`@canonical/summon-core`](../../lib/summon-core/) — code generation runtime
- [`@canonical/summon-component`](../../lib/summon-component/) — component generator
- [`@canonical/summon-package`](../../lib/summon-package/) — package generator

## License

GPL-3.0
