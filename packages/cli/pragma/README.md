# @canonical/pragma

CLI and MCP server for Canonical's design system. Query components, standards, modifiers, tokens, and ontologies from the terminal or your editor.

## Installation

```bash
bun add -g @canonical/pragma
```

## Usage

```sh
pragma --help
pragma --version
pragma component list
pragma component get Button --detailed
```

## Global Flags

| Flag | Description |
|------|-------------|
| `--llm` | Condensed Markdown output for LLM consumption |
| `--format json` | JSON output |
| `--verbose` | Diagnostic output to stderr |

## Configuration

Create a `pragma.config.toml` in your project root:

```toml
tier = "apps/lxd"
channel = "normal"    # normal | experimental | prerelease
```

When no config file is present, pragma defaults to no tier and `normal` channel.

## Error Handling

Errors follow a three-part structure (message, context, recovery):

```
Error: component "Buton" not found.

Did you mean?
  - Button
  - ButtonGroup

Run `pragma component list`
```

With `--format json`, errors are returned as structured JSON. With `--llm`, errors are Markdown.

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

## Scripts

```bash
bun run check          # biome + tsc
bun run test           # vitest
bun run build:compile  # bun build --compile (produces dist/pragma)
bun run test:compile   # E1 WASM embedding validation
```

## Compiled Binary

pragma targets a compiled single-file executable via `bun build --compile`. The Oxigraph WASM module embeds automatically — no manual embedding or side-loading required (validated in [E1-WASM-FINDINGS.md](./E1-WASM-FINDINGS.md)).

```bash
bun build --compile --minify src/bin.ts --outfile dist/pragma
```

Binary size: ~98 MB (linux-x64), ~58 MB (darwin-arm64). The Bun runtime (~90 MB) dominates; Oxigraph WASM adds ~4 MB.

## Architecture

pragma uses the federation pattern from `cli-framework`: each domain exports `CommandDefinition[]`, and the root CLI registers them into a single Commander.js program. Output adapters handle plain text, LLM markdown, and JSON rendering.

## Dependencies

- [`@canonical/ke`](../runtime/ke/) — triple store runtime (Oxigraph WASM)
- [`cli-framework`](../core/) — shared CLI machinery (Commander.js registration, help formatting, completions)
- [`smol-toml`](https://github.com/nicolo-ribaudo/smol-toml) — TOML parser for `pragma.config.toml`

## License

GPL-3.0
