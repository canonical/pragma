# Architecture

pragma is built on one idea: **one grammar, many projections.** A single declarative description of every capability is projected into a CLI, an MCP server, a machine-readable surface covenant, and this documentation. Nothing is hand-wired twice, so the surfaces cannot drift.

## Layers

### Kernel — the grammar and its projections

Every capability is a `VerbSpec`: a `path` (`[noun]` or `[noun, verb]`), a summary and doc, typed `params`, output formatters, a `capability` profile (store / mutation / MCP exposure), and a `run` body. The grammar is the single source of truth; a set of pure, zod-free projectors read it:

- **`emitSurface`** — freezes the machine-readable surface covenant (tool set, flags, envelope, exit codes) that conformance tests protect.
- **`registerVerb`** — adapts a verb into an MCP tool: it builds the zod input schema, derives annotations, and wraps a mutation in the plan-first `confirm` flow.
- **`emitReference`** — projects the grammar into the Markdown [reference](./reference/index.md) (a sibling of `emitSurface`; the build writes it back and a drift-guard pins it).

Keeping the projectors pure and zod-free is what lets `--help` and shell completion stay on a fast path that never boots the store.

### Store — the design-system knowledge graph

The read capabilities query a local, content-addressed graph. `pragma sources update` resolves each configured package (git, file, or npm) and builds one [oxigraph](https://github.com/oxigraph/oxigraph)-backed pack under `$XDG_CACHE_HOME/pragma/packs/<contentHash>/` — the graph dump, the extracted schema, the storeless entity index, the packages' own read stories, and a manifest; a one-line pointer in the same cache records which pack a project reads. The binary also carries the distribution's own pack compiled in, so a fresh install answers reads before anything is built. One predicate decides between them — `resolveSources` — and every surface that reports on the store switches on its answer rather than re-deriving one: a project that declared its own packs and never built them is never served the shipped snapshot **for a read**, and is told so by name.

Completion **candidates** are the one bounded exception, and it is deliberate. The storeless `--help` / `__complete` fast path is denied the config layer entirely — no zod, no evaluator — so it can see the active-pack pointer but not `origins.packs`. With no pointer it cannot distinguish a fresh install from a configured-but-unbuilt project, and it offers the shipped snapshot's names. Candidates only: every read in that project still refuses with `STORE_UNAVAILABLE`. Pinned by `entitySource.test.ts`'s "still offers the snapshot's names in a configured-but-unbuilt project (the documented price)".

At runtime a **`LazyStore`** boots the graph on first use and memoizes it. A storeless verb (`config show`, `doctor`, `sources status`, `capabilities`) never reaches the store factory, so the storeless guarantee holds by construction rather than by convention.

### Capabilities — the catalog

The concrete verbs live under `src/capabilities/` as `CapabilityModule`s, collected into one array. A directory exists there only where its noun needs hand-written code, and after L-OPEN-9 that is the kernel's own nouns and nothing else (`info`, `config`, `sources`, `doctor`, `graph`, `ontology`, `prompt`, `skill`, `setup`, `upgrade`, `create`, `capabilities`, `colophon`, `meta`). **Every design-system read noun is a declarative story**: the distribution's own five are declared as data in `pragma.conf.ts` and compiled at module load through the same compiler a third-party story goes through. The three reads that were still code — the tier-chain-filtered block list, the bespoke tier lookup, and the tokens-config writer — were either expressed in the grammar or removed, so a fork now defines its entire read surface in `pragma.conf.ts`.

Stories from a project's config, or from a `stories/*.json` a package ships, merge into that array at dispatch — see [config-model.md](./config-model.md#read-stories) for the tiers and their precedence. The projectors consume the one array, so a new module or a new story appears in the CLI, the MCP server, and the generated reference at once.

### Frontends — CLI and MCP

Two thin frontends turn the grammar into runnable surfaces:

- **CLI** — `buildProgram` wires the grammar into a Commander program; `dispatch` runs the resolved verb across the effect seam (a read is plain async; a mutation returns a `Task` interpreted under the node / preview / undo interpreters) and renders the outcome.
- **MCP** — `buildServer` registers every exposed verb via `registerVerb`, installs the resource and prompt surfaces, and attaches the handshake instructions.

Both frontends resolve configuration through the same **config seam** — the three-layer resolver described in [config-model.md](./config-model.md) — so the CLI and the MCP server always agree on the active tier, channel, and package sources.

## The effect seam

Mutations never touch the filesystem directly. A mutating `run` returns a `Task` — a description of its effects — which the frontend interprets. The CLI interprets it under `--dry-run` (preview), `--undo` (reverse), or real execution; the MCP handler interprets it as a plan unless `confirm: true`. One Task description, several interpreters — the reason `--dry-run` and MCP's plan-first preview share exactly one code path.

A preview is `@canonical/task/node`'s `runPreview`, and it is **honest**: reads (`ReadFile`, `Exists`, `Glob`) hit the real filesystem through a virtual write overlay, so a step sees what the step before it planned; writes are recorded and never executed, so the disk is untouched. A preview therefore fails exactly where and how the run would fail — a mutation whose first template read is missing exits nonzero under `--dry-run` and returns an error from MCP plan-first, instead of printing a confident plan and exiting 0. Two limits are deliberate and permanent: `Exec` is never spawned (a preview that runs commands is not a preview), so a task whose success depends on a command's real output can preview cleaner than it runs; and prompts auto-answer with their defaults, so a preview never blocks on input.

## Further reading

- [Command & tool reference](./reference/index.md) — the generated surface.
- [Configuration model](./config-model.md) — the config seam in detail.
- [MCP integration](./mcp-integration.md) — the server surfaces.
