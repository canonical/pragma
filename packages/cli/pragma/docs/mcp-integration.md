# MCP Integration Guide

pragma exposes a Model Context Protocol (MCP) server that gives AI agents structured access to the Canonical design system knowledge graph: blocks (components), code standards, modifiers, tokens, tiers, ontologies, and skills.

## Transport

pragma uses **stdio** transport. The AI harness spawns `pragma mcp` as a subprocess and communicates over stdin/stdout using JSON-RPC.

## Automated Setup

```bash
pragma setup mcp
```

This auto-detects installed AI harnesses (Claude Code, Cursor, Windsurf) and writes the appropriate configuration file. Use `--dry-run` to preview changes, `--undo` to reverse.

Force a specific harness:

```bash
pragma setup mcp --claude-code
pragma setup mcp --cursor
pragma setup mcp --windsurf
```

## Manual Setup

Add to your `.mcp.json` (Claude Code) or equivalent config:

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

## Agent Workflow

A typical agent session:

1. Call `capabilities` to discover available tools (~100 tokens)
2. Call `llm` for full orientation: design system context, decision trees, command reference
3. Use read tools (`block_lookup`, `standard_lookup`, etc.) to gather specific data
4. Use write tools (`create_component`, `config_tier`, etc.) to make changes

## Tool Reference

### Envelope Format

Every tool response follows a consistent JSON envelope:

```
Success:    { ok: true, data: T, meta: { count?, filters? } }
Condensed:  { ok: true, condensed: true, text: string, tokens: string }
Error:      { ok: false, error: { code, message, suggestions?, recovery? } }
```

Agents should branch on `ok` first, then check for `condensed`.

### Read Tools

#### `block_list`

List design system blocks visible under current tier and channel.

Parameters:
- `allTiers` (boolean, optional) — ignore tier filter, show all blocks
- `digest` (boolean, optional) — include implementation paths per block
- `detailed` (boolean, optional) — include full details per block
- `condensed` (boolean, optional) — return token-optimized Markdown

#### `block_lookup`

Look up detailed information about one or more blocks including anatomy tree, modifiers, tokens, and applicable standards. Returns partial results — successful lookups in `results`, failures in `errors`.

Parameters:
- `names` (string[], required) — block names or IRIs (e.g., `["Button"]`)
- `detailed` (boolean, optional) — return full details
- `condensed` (boolean, optional) — return token-optimized Markdown

#### `standard_list`

List all code standards with optional filtering.

Parameters:
- `category` (string, optional) — filter by category (e.g., "tsdoc", "react")
- `search` (string, optional) — full-text search across names and descriptions
- `condensed` (boolean, optional) — return token-optimized Markdown

#### `standard_lookup`

Look up one or more standards with full do/don't code examples. Returns partial results — successful lookups in `results`, failures in `errors`.

Parameters:
- `names` (string[], required) — standard names or IRIs (e.g., `["react/component/props"]`)
- `condensed` (boolean, optional) — return token-optimized Markdown

#### `standard_categories`

List standard categories with counts.

No parameters.

#### `modifier_list`

List all modifier families.

Parameters:
- `condensed` (boolean, optional) — return token-optimized Markdown

#### `modifier_lookup`

Look up one or more modifier families with their values. Returns partial results — successful lookups in `results`, failures in `errors`.

Parameters:
- `names` (string[], required) — modifier family names
- `condensed` (boolean, optional) — return token-optimized Markdown

> **Note:** `token_list`, `token_lookup`, and `token_sample` are currently
> feature-flagged off (`src/domains/token/featureFlag.ts`) because the
> published design-system data does not yet contain token instances.

#### `tier_list`

List all tiers in the hierarchy.

Parameters:
- `condensed` (boolean, optional) — return token-optimized Markdown

#### `config_show`

Show current pragma configuration (tier, channel).

No parameters.

#### `ontology_list`

List loaded ontology namespaces with class and property counts.

Parameters:
- `condensed` (boolean, optional) — return token-optimized Markdown

#### `ontology_show`

Show the TBox for a namespace: class hierarchy (topologically ordered, with
instance counts and attached properties), unattached properties, SHACL
constraint summaries, and the owl:Ontology header. All IRIs are compact;
the response carries the `prefixes` map needed to expand them.

Parameters:
- `prefix` (string, required) — namespace prefix (e.g., "ds", "cs")
- `class` (string, optional) — deep-dive into one class (label, local name, or compact IRI): super chain, direct + inherited properties, reverse references, sample instances, and ready-to-run follow-up queries (returned as `focus`)
- `properties` (boolean, optional) — include datatype properties (attributes) in condensed output; default shows relations only
- `fullUris` (boolean, optional) — expand compact IRIs to full URIs in condensed output (the structured `data` is always canonical: compact IRIs + `prefixes` map)
- `condensed` (boolean, optional) — return token-optimized Markdown

#### `graph_query`

Execute a raw SPARQL SELECT query against the ke triple store.

Parameters:
- `query` (string, required) — SPARQL SELECT query

#### `graph_inspect`

Inspect all triples where a given URI appears as subject.

Parameters:
- `uri` (string, required) — full URI or prefixed form (e.g., "ds:global.component.button")

#### `skill_list`

List discovered agent skills from installed design system packages.

Parameters:
- `condensed` (boolean, optional) — return token-optimized Markdown

#### `skill_lookup`

Get full skill instructions (SKILL.md content) for one or more agent skills by name.

Parameters:
- `names` (string[], required) — skill names to look up (e.g., `["design-auditor"]`)
- `condensed` (boolean, optional) — return token-optimized Markdown

#### Story-pack tools (experimental)

Declarative read stories from `pragma.config.json` (`stories`) or semantic
packages (`stories/*.json`) register additional `<noun>_list` /
`<noun>_lookup` tools at boot — the same envelope, condensed mode, and
batch-error semantics as the built-in read tools. See the README's
"Custom read stories" section for the format.

### Write Tools

#### `config_tier`

Set the project tier (written to the nearest `pragma.config.json`, or the global config).

Parameters:
- `tier` (string, required) — tier path (e.g., "apps/lxd")

#### `config_channel`

Set the release channel (written to the nearest `pragma.config.json`, or the global config).

Parameters:
- `channel` (string, required) — one of "normal", "experimental", "prerelease"

#### `tokens_add_config`

Add Terrazzo token build configuration to the project.

No parameters.

#### `create_component`

Scaffold a new design system component using the summon generator.

Parameters:
- `name` (string, required) — component name in PascalCase (e.g., "StatusLabel")

#### `create_package`

Scaffold a new monorepo package using the summon generator.

Parameters:
- `name` (string, required) — package name (e.g., "my-utils")

### Orientation Tools

#### `capabilities`

List all available pragma MCP tools organized by category with counts. Costs ~100 tokens. Call this first to discover what pragma can do.

No parameters.

#### `llm`

Get full LLM orientation for the design system. Returns:
- **context** — current design system summary (block count, standard count, token count)
- **decisionTrees** — step-by-step guides for common intents (implement component, check standards, etc.)
- **commandReference** — all tools with token cost estimates

No parameters.

### Diagnostic Tools

#### `doctor`

Run diagnostic checks: config file, ke store health, node version, MCP configuration, shell completions, skills symlinks, Terrazzo setup.

No parameters.

#### `info`

Show pragma version, ke store summary (triple/namespace counts), and installed package versions.

No parameters.

## Structured Recovery

When a tool returns an error, the `recovery` field tells the agent what to try next:

```json
{
  "ok": false,
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "block \"Buton\" not found.",
    "suggestions": ["Button", "ButtonGroup"],
    "recovery": {
      "tool": "block_list",
      "params": {}
    }
  }
}
```

Error codes:
- `ENTITY_NOT_FOUND` — the named entity does not exist in the store
- `EMPTY_RESULTS` — query returned no results (filters too restrictive)
- `INVALID_INPUT` — parameter value is invalid
- `AMBIGUOUS_INPUT` — parameter matches multiple entities
- `STORE_ERROR` — ke store failed to initialize
- `CONFIG_ERROR` — pragma.config.toml is invalid
- `INTERNAL_ERROR` — unexpected error

## MCP Resources

Every subject URI in the ke graph is exposed as a discoverable MCP resource via the `pragma:{+uri}` template. Resources support:

- **Listing** — enumerate all subject URIs in the graph
- **Completion** — prefix-based completion for URI parameters
- **Reading** — returns all properties for a URI with level-1 object relations resolved to summaries (labels and descriptions)

Resource responses are JSON with fields: `uri`, `prefixed`, `types`, `label`, `description`, and `properties` (grouped by predicate).

## Disclosure Levels

List tools support disclosure levels via boolean parameters:

| Level | Parameter | Response Size |
|-------|-----------|---------------|
| Summary | (default) | ~50 tokens/item |
| Digest | `digest: true` | ~150 tokens/item |
| Detailed | `detailed: true` | ~500 tokens/item |

Agents should start with summary disclosure and escalate to detailed only when needed, to minimize token consumption.

## Condensed Mode

Pass `condensed: true` to any read tool to receive token-optimized Markdown instead of structured JSON. The condensed output reuses the CLI's `--llm` formatter. This is useful when agents need human-readable output rather than structured data for further processing.
