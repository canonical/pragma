# @canonical/pragma-cli

`pragma` is a command-line tool **and** a Model Context Protocol (MCP) server over Canonical's design-system knowledge graph. A single grammar of capabilities is projected two ways — as CLI commands for humans and as MCP tools for agents — both reading the same local, content-addressed store built from your design-system packs.

## Install

```bash
npm install -g @canonical/pragma-cli
```

This installs the `pragma` command. The package ships compiled JavaScript and runs on **Node.js 22.18+ or 23.6+** (any 24 or later), on any platform Node supports — pragma reads its own `pragma.config.ts` through Node's TypeScript type stripping, which is on by default from those versions. Node 23.0-23.5 are excluded deliberately: they
satisfy a plain `>=22.18` but predate the 23.x line's own default-on release.

Check your environment and confirm the install:

```bash
pragma doctor
```

## Quickstart

```bash
pragma block list
pragma block lookup Button
pragma sources status
pragma sources update
pragma capabilities
```

Reads answer from the moment you install: the package carries a compiled snapshot of the design system, so `block list` and `block lookup` work with no cache and no network. `pragma sources update` rebuilds the store from the live packs named in your `pragma.config.ts`; `pragma sources status` reports which of the two is answering and what it was built from.

To register pragma with a detected AI harness as an MCP server:

```bash
pragma setup mcp
```

See [docs/mcp-integration.md](./docs/mcp-integration.md) for the full MCP surface, and the [command & tool reference](./docs/reference/index.md) for every command and tool.

## Two planes

pragma is extended along two independent planes:

- **Data plane — the content.** Your design system is a set of packs listed in `pragma.config.ts` (`packs: [...]`). `pragma sources update` compiles them into the local knowledge graph the read commands query. Point pragma at different packs and every `list` / `lookup` / `sample` command answers from that graph — and until you build them, the reads say so rather than answering from the shipped snapshot.
- **Behaviour plane — the capabilities.** Every command and MCP tool is one entry in a single capability grammar, projected to both the CLI and the MCP server. The [reference](./docs/reference/index.md) is generated from that grammar, so it can never drift from the code.

## Relationship to summon

`@canonical/summon` is a separate scaffolding product. pragma MOUNTS summon's generator tree under `create` — the surface is a projection of the same grammar, so a scaffolding command —

```bash
pragma create component react src/components/Button
```

— is `summon component react src/components/Button` wearing a different binary: same tree segments, same prompt-derived flags, same wizard, byte-identical output for `component`, `package`, and `application` alike. summon is not a runtime dependency. Each generator package ships its own template tree, so all three run from a published install. Parity is not written down but EXECUTED: `crossCli.subprocess.test.ts` runs both CLIs over the same argv and compares what they emit.

## MCP

Run pragma as an MCP server over stdio via `pragma setup mcp` (automatic harness registration) or the manual `pragma mcp serve` command. The server exposes the read and scaffold tools, a `pragma:{+uri}` resource surface for entity reads, whatever workflow prompts the active graph declares (none, for this distribution's current graph), and handshake instructions describing the discovery sequence. Mutating tools are plan-first — they return the plan they would apply until called with `confirm: true`. See [docs/mcp-integration.md](./docs/mcp-integration.md).

## Documentation

- [Getting started](./docs/getting-started.md)
- [MCP integration](./docs/mcp-integration.md)
- [Configuration model](./docs/config-model.md)
- [Architecture](./docs/architecture.md)
- [Skills](./docs/skills.md)
- [Command & tool reference](./docs/reference/index.md)
- [Changelog](./CHANGELOG.md)

## License

GPL-3.0
