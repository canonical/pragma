# Getting started

pragma turns a design system into a queryable knowledge graph, then projects it as a CLI and an MCP server. This guide walks from a fresh install to reading the graph, tuning scope, and orienting an agent.

## Install and check

Install the global binary, then run the environment check:

```bash
pragma doctor
```

`pragma doctor` runs nine health checks — runtime, config, store, MCP registration, skills — and prints pass / fail / skip with an inline remedy for each. It never needs the store, so it works before you have built one.

## Build the store

A read command needs a local store. Build it from the packages named in your `pragma.config.ts`:

```bash
pragma sources update
```

This resolves each configured package (git, file, or npm), builds one content-addressed pack, and writes `pragma.lock.json`. Later boots load from the lock with no network access. Check readiness and per-source staleness at any time:

```bash
pragma sources status
```

`sources status` is storeless — it reads the lock, config, and pack cache without booting the store, so it reports honestly even when the store is cold.

## Read the graph

The read nouns list, look up, and sample entities in the graph:

```bash
pragma block list
pragma block lookup Button
pragma standard list
pragma token list
pragma ontology list
pragma tier list
```

- `block list` shows blocks visible under the active tier chain and channel; add `--all-tiers` to ignore the tier filter.
- `block lookup Button` returns the full spec of one or more blocks by name, IRI, or glob.
- `standard list` lists code standards; narrow with `--category react`.
- `token list`, `ontology list`, and `tier list` browse tokens, ontology namespaces, and the tier hierarchy.

Every read noun also offers `lookup` and (where declared) `sample` — call `sample` before writing a query to see real data shapes.

## Output modes

pragma renders every command in one of three modes:

- **plain** (default) — human-readable text for a terminal.
- **`--llm`** — condensed Markdown tuned for agents. It turns on **automatically** when output is piped (a non-TTY), so agent tooling gets the compact form without asking.
- **`--format json`** — the full `{ ok, data, meta }` envelope for scripts.

```bash
pragma block lookup Button --llm
pragma block list --format json
```

`--format` accepts only `json` or `plain`. There is no separate `llm` format — reach for the `--llm` flag when you want condensed Markdown.

## Configuration and state

`config show` prints the resolved configuration and marks which layer (defaults, global, or project) supplied each field:

```bash
pragma config show
```

Two fields scope what the read commands see. Set the active tier and release channel (written to your global config):

```bash
pragma config tier apps/lxd
pragma config channel experimental
```

`info` reports the version, install provenance, an entity total, and (silently, over the network) whether a newer release exists:

```bash
pragma info
```

See [config-model.md](./config-model.md) for the three-layer model and every writable field.

## Orient an agent

Three storeless commands give an agent (or a new user) its bearings:

```bash
pragma capabilities
pragma colophon
pragma prompt list
pragma prompt lookup build-a-block
```

- `capabilities` returns the conventions, a four-stage discovery sequence, and the annotated tool catalog — call it first at session start.
- `colophon` narrates how pragma and the active design-system domain are made.
- `prompt list` browses the workflow prompt templates the design system ships; `prompt lookup <name>` prints one template's body and arguments.

## Next steps

- [MCP integration](./mcp-integration.md) — run pragma as an MCP server and wire it into a harness.
- [Configuration model](./config-model.md) — the layered config and every field.
- [Command & tool reference](./reference/index.md) — every command, flag, and tool.
