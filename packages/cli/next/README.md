# @canonical/pragma-cli

`pragma` is a command-line tool **and** a Model Context Protocol (MCP) server over Canonical's design-system knowledge graph. A single grammar of capabilities is projected two ways — as CLI commands for humans and as MCP tools for agents — both reading the same local, content-addressed store built from your design-system packages.

## Install

```bash
npm install -g @canonical/pragma-cli
```

This installs the `pragma` binary: a prebuilt, standalone executable (`dist/pragma`). The package publishes for **Linux x64 only** (`"os": ["linux"]`, `"cpu": ["x64"]`) — other platforms are not yet shipped.

Check your environment and confirm the install:

```bash
pragma doctor
```

## Quickstart

```bash
pragma sources update
pragma sources status
pragma block list
pragma block lookup Button
pragma capabilities
```

`pragma sources update` resolves the design-system packages named in your `pragma.config.ts`, builds one local store, and writes `pragma.lock.json`. Once built, every read command answers from the store with no network access.

To register pragma with a detected AI harness as an MCP server:

```bash
pragma setup mcp
```

See [docs/mcp-integration.md](./docs/mcp-integration.md) for the full MCP surface, and the [command & tool reference](./docs/reference/index.md) for every command and tool.

## Two planes

pragma is extended along two independent planes:

- **Data plane — the content.** Your design system is a set of semantic packages listed in `pragma.config.ts` (`packages: [...]`). `pragma sources update` compiles them into the local knowledge graph the read commands query. Point pragma at different packages and every `list` / `lookup` / `sample` command answers from that graph.
- **Behaviour plane — the capabilities.** Every command and MCP tool is one entry in a single capability grammar, projected to both the CLI and the MCP server. The [reference](./docs/reference/index.md) is generated from that grammar, so it can never drift from the code.

## Relationship to summon

`@canonical/summon` is a separate scaffolding product. pragma reuses summon's generator core so that its scaffolding commands —

```bash
pragma create component src/components/Button --framework react
```

— produce output byte-identical to summon's own `component`, `package`, and `application` generators. summon is not a runtime dependency: the generators are embedded in the `pragma` binary, so `pragma create component` runs from a clean install.

## MCP

Run pragma as an MCP server over stdio via `pragma setup mcp` (automatic harness registration) or the manual `pragma mcp` entry point. The server exposes the read and scaffold tools, a `pragma:{+uri}` resource surface for entity reads, the design system's workflow prompts, and handshake instructions describing the discovery sequence. Mutating tools are plan-first — they return the plan they would apply until called with `confirm: true`. See [docs/mcp-integration.md](./docs/mcp-integration.md).

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
