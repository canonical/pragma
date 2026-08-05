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

The concrete verbs live under `src/capabilities/` as `CapabilityModule`s, collected into one array. A directory exists there only where its noun needs hand-written code — the kernel's own nouns (`info`, `config`, `sources`, `doctor`, `graph`, `ontology`, `prompt`, `skill`, `setup`, `upgrade`, `create`, `capabilities`, `colophon`), and nothing else. There are ZERO hand-written data commands: every design-system read noun is a **declarative story**, and the distribution's own five are declared as data in `pragma.conf.ts` and compiled at module load through the same compiler a third-party story goes through. A fork defines its entire read surface in its own config, with no code.

Stories from a project's config, or from a `stories/*.json` a package ships, merge into that array at dispatch — see [config-model.md](./config-model.md#read-stories) for the tiers and their precedence. The projectors consume the one array, so a new module or a new story appears in the CLI, the MCP server, and the generated reference at once.

### Frontends — CLI and MCP

Two thin frontends turn the grammar into runnable surfaces:

- **CLI** — `buildProgram` wires the grammar into a Commander program; `dispatch` runs the resolved verb across the effect seam (a read is plain async; a mutation returns a `Task` interpreted under the node, plan, or undo interpreters) and renders the outcome.
- **MCP** — `buildServer` registers every exposed verb via `registerVerb`, installs the resource and prompt surfaces, and attaches the handshake instructions.

Both frontends resolve configuration through the same **config seam** — the three-layer resolver described in [config-model.md](./config-model.md) — so the CLI and the MCP server always agree on the resolved configuration and the package sources.

## The effect seam

Mutations never touch the filesystem directly. A mutating `run` returns a `Task` — a description of its effects — which the frontend interprets. The CLI interprets it under `--dry-run` (plan), `--undo` (reverse), or real execution; the MCP handler interprets it as a plan unless `confirm: true`. One Task description, several interpreters — and `--dry-run` and MCP's plan-first preview share exactly one of them (`planTask`, from `@canonical/task/node`).

**A plan READS FOR REAL and simulates only destruction.** `ReadFile`, `Exists`, `Glob` and the context effects are performed against the real filesystem. `TransformFile` performs its read half for real and writes its **output to the overlay**, so a chained transform — and any later `ReadFile` — plans the bytes the run produces, while nothing reaches the disk. `WriteFile`, `AppendFile`, `CopyFile`, `CopyDirectory`, `MakeDir` and `Symlink` are simulated over that same virtual overlay of the paths the plan would create, including the ancestor directories each would bring into being; `DeleteFile`, `DeleteDirectory` and `Exec` are simulated with no overlay entry, `Log` becomes a plan line rather than output, and `Prompt` is mocked. That is what lets a plan describe the shape a run would actually take: a mutation whose next effect depends on what it just read plans the same branch it runs, and a mutation whose real run dies on a read fails the plan too, with the same exit code, instead of reporting a full success.

What a plan still cannot tell you is enumerated once, in `@canonical/task`'s `lib/plan.ts` module docblock — that list is the authority and this paragraph defers to it rather than re-counting: `Exec` answers empty-and-successful (running the command is the one thing a plan must not do), `CopyFile`/`CopyDirectory` do not probe their source, a copied or `mkdir`-ed path exists to the plan but has no readable bytes, `Glob` is real but does not see what the plan itself would have written, a simulated delete is not subtracted, and a simulated write/`mkdir`/copy cannot FAIL where its real counterpart does. Not all six are reachable from a shipped verb: none of them globs or copies, so those two are latent here; `setup skills` and `sources update` do delete and symlink, so the delete-not-subtracted and creation-cannot-fail residuals are live. `src/testing/behavioral/dryRunParity.test.ts` runs real capabilities both ways and asserts the two effect sequences agree — same tags, same paths, same bytes written — with that boundary stated rather than assumed.

## Further reading

- [Command & tool reference](./reference/index.md) — the generated surface.
- [Configuration model](./config-model.md) — the config seam in detail.
- [MCP integration](./mcp-integration.md) — the server surfaces.
