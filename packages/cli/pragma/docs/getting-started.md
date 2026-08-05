# Getting started

pragma turns a design system into a queryable knowledge graph, then projects it as a CLI and an MCP server. This guide walks from a fresh install to reading the graph, configuring the CLI, and orienting an agent.

## Install and check

Install the global binary, then run the environment check:

```bash
pragma doctor
```

`pragma doctor` runs nine health checks — runtime, config, store, MCP registration, skills — and prints pass / fail / skip with an inline remedy for each. It never needs the store, so it works before you have built one.

## The store

Reads work from the moment you install. The binary carries a compiled snapshot
of the design system, so `block list` answers on a machine with no cache, no
network, and no git credentials.

The snapshot is a snapshot: it was compiled when the release was, and it does
not move. Rebuild the store from the live packs — the ones named in your
`pragma.config.ts` — whenever you want what is upstream today:

```bash
pragma sources update
```

This resolves each configured package (git, file, or npm) and builds one
content-addressed pack, which every later boot loads with no network access. To
pin a package to an exact revision, put the full 40-character commit SHA in its
source ref (`git+https://github.com/org/repo.git#<sha>`) — every update then
resolves to exactly that commit. An abbreviated SHA is not a valid fetch target
and the update fails naming it. Which pack is answering, and what it was built
from:

```bash
pragma sources status
```

`sources status` is storeless — it reads config and the pack cache without
booting the store, so it reports honestly even when the store is cold. It
reports `embedded` for the shipped snapshot, `built` for a pack you built, and
`unavailable` when a project has declared its own packs and never built them.
That last case is deliberate: a project pointed at its own graph is never
quietly served the distribution's instead — the read fails and names
`pragma sources update`.

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

- `block list` lists every block in the graph — components, patterns, layouts and subcomponents. It takes no flags and is not narrowed by the configured tier or channel.
- `block lookup Button` returns the full spec of one or more blocks by name, IRI, or glob.
- `standard list` lists code standards; narrow with `--category react`.
- `token list`, `ontology list`, and `tier list` browse tokens, ontology namespaces, and the tier hierarchy. This distribution's graph currently carries no token entities, so `token list` is honestly empty until a pack that ships them is configured and built.

Every read noun also offers `lookup` and (where declared) `sample` — call `sample` before writing a query to see real data shapes.

## Output modes

pragma renders every command in one of three modes:

- **`--format plain`** (default) — human-readable text for a terminal.
- **`--format llm`** — condensed Markdown tuned for agents. It turns on **automatically** when output is piped (a non-TTY), so agent tooling gets the compact form without asking.
- **`--format json`** — the full `{ ok, data, meta }` envelope for scripts.

```bash
pragma block lookup Button --format llm
pragma block list --format json
```

`--format` accepts `plain`, `llm`, or `json`. When omitted, pragma auto-detects — `llm` when output is piped, `plain` on an attended terminal.

## Configuration and state

`config show` prints the resolved configuration and marks which layer (defaults, global, or project) supplied each field:

```bash
pragma config show
```

Two fields are recorded in your config and narrow nothing today: `tier` has no behavioural reader at all, and `channel`'s only reader is `info`'s update check, which resolves the matching npm dist-tag. Set them for forward compatibility (written to your global config):

```bash
pragma config set tier apps/lxd
pragma config set channel experimental
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
```

- `capabilities` returns the conventions, a four-stage discovery sequence, and the annotated tool catalog — call it first at session start.
- `colophon` narrates how pragma and the active design-system domain are made.
- `prompt list` browses the workflow prompt templates in the active graph, and `prompt lookup <name>` prints one template's body and arguments. This distribution's graph carries no prompt entities today, so `prompt list` reports `_No prompts in the store._`; the surface is populated by configuring a pack whose graph declares them.

## Next steps

- [MCP integration](./mcp-integration.md) — run pragma as an MCP server and wire it into a harness.
- [Configuration model](./config-model.md) — the layered config and every field.
- [Command & tool reference](./reference/index.md) — every command, flag, and tool.
