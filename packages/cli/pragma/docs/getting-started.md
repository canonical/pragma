# Getting started

Three steps: install the CLI, ask it something, then pick the page that matches what you came for.

## Install

```bash
bun add --global @canonical/pragma-cli
# or: npm install -g @canonical/pragma-cli
```

The package ships compiled JavaScript and runs on **Node.js 22.18+ or 23.6+** (any 24 or later). Then check the environment:

```bash
pragma doctor
```

`pragma doctor` prints one row per check, with the next step inline wherever there is one. Nothing needs to pass before your first read — it is there so you know the state of things.

## First read

The package carries a compiled snapshot of the design system, so reads answer immediately — no network, no cache, no project setup:

```bash
pragma block list
pragma block lookup Button
```

`block list` is the blocks of the five top-level tiers, each with its tier — the design system's shared vocabulary, without the 79 that belong to an individual product's tier. The heading says which tiers it answered from, and one argument changes that: `--tier apps_lxd` adds LXD's blocks to the global ones they build on, `--tier all` shows every tier. Set the default once with `pragma config set tier apps_lxd`.

`block lookup Button` is one block's full spec — summary, guidelines, anatomy, properties. The same scope decides WHICH Button: several tiers have one, and a bare name answers with the in-scope one. A name that lives only outside the scope is still answered, with a line saying where from. Lookups take names or globs (`'Nav*'`), so a rough idea of the name is enough.

## Where to go next

- [The design system graph](./design-system.md) — blocks, tiers, modifiers, standards, and how to read a block's anatomy tree. Start here to learn what the graph can tell you.
- [Setup and health](./setup.md) — the `pragma setup` wizard (config, completions, MCP, skills, the editor extension), global vs local project scope, and `pragma doctor` in depth.
- [MCP integration](./mcp-integration.md) — run pragma as an MCP server and give your AI agent the same graph.
- [Configuration model](./config-model.md) — the layered configuration, and pointing pragma at your own design system.
- [Command & tool reference](./reference/index.md) — every command, flag, and tool.
