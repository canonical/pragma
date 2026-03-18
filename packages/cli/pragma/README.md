# @canonical/pragma

CLI and MCP server for Canonical's design system. Query components, standards, modifiers, tokens, and ontologies from the terminal or your editor.

## Installation

```bash
bun add -g @canonical/pragma
```

## Status

v0.1 kernel — package scaffold, config, PM detection, error infrastructure. Commands land in v0.2.

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

## Dependencies

- [`@canonical/ke`](../runtime/ke/) — triple store runtime (Oxigraph WASM)
- [`smol-toml`](https://github.com/nicolo-ribaudo/smol-toml) — TOML parser for `pragma.config.toml`
