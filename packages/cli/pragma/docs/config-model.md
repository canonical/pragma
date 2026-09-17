# Configuration model

How to author a pragma configuration. **Every field, its type and its layering behaviour are in the generated [configuration reference](./reference/config.md)**, which is projected from the config type and pinned by a drift guard; this page is the guide beside it and does not restate the table.

## The three layers

From lowest to highest precedence:

1. **Built-in defaults** — the distribution config `pragma.conf.ts`, shipped with the package (identity, default packs and the read stories they supply, `channel: normal`, `detail: standard`).
2. **Global config** — `$XDG_CONFIG_HOME/pragma/config.json`. Machine-wide state, written by the config setters.
3. **Project config** — the nearest `pragma.config.ts`, walking up from the current directory. It is *evaluated* (not just parsed), and the result is content-hash cached under `$XDG_STATE_HOME/pragma/config-cache/<sha256>.json` so a re-run skips re-evaluation when the file is unchanged.

A higher layer **replaces** a lower one field by field. No field merges: a project declaring one `prefixes` entry replaces the whole map, including the namespaces the distribution's own packs are built with. `pragma config show` prints four fields with the layer that supplied them; what the other seven do instead is in the reference under [What `config show` reports](./reference/config.md).

## Read stories

A **read story** is a noun described as data — a SPARQL `list`, a generated `lookup`, and the columns, filters and disclosure levels they project — which the CLI compiles into real commands and MCP tools. Nothing about a story is hand-written code, and since L-OPEN-9 no shipped data noun has any either: each of the five is exactly what its story declares, nothing more (see [architecture.md](./architecture.md)).

Stories reach the CLI from three places, weakest to strongest:

| Tier | Where it is declared | Validation failure |
| --- | --- | --- |
| **distribution** | `packs[].stories` in the distribution's own `pragma.conf.ts` | compile-time: `tsc` for the shape, plus the `parsePackDefinition` round-trip in `distribution.test.ts` for the grammar |
| **package** | `stories/*.json` shipped by a package the active pack was built from | the story is **ignored**, named on stderr and under `doctor`'s `pack refs` |
| **config** | `packs[].stories`, then the top-level `stories`, in your config | fatal `CONFIG_ERROR` |

Only your **config** may replace a noun the CLI already ships, and then only one that is itself story-backed — never a built-in command such as `config` or `doctor`. A **package** may add a noun the CLI does not have, and nothing else: a package story naming a shipped noun is ignored and reported, because replacing a noun replaces its whole module, so a dependency you merely declared could otherwise swap out this distribution's own design-system reads.

Within your config the top-level `stories` wins over `packs[].stories` for the same noun — declaring it in both is a refinement, not a conflict — and declaring the same noun twice inside your config is an error. Inside one package the last story file wins and `doctor` names the shadowed one.

Package stories are third-party data, so they are never fatal: a malformed or schema-invalid file is dropped, the rest of the package still works, and `pragma doctor` names each ignored file under `pack refs` (which stays `pass` — the pack does answer reads).

One limit a package author should know: a query naming a prefix the answering graph does not bind currently reports `STORE_UNAVAILABLE` with a `sources update` recovery rather than naming the prefix — check your prefixes against `pragma graph query` first.

An empty-state hint names a **call**, not a command line: `emptyRecovery: { message, call: { verb: "sources update", params?: {…} } }`. The consuming distribution spells it for whoever is reading — `pragma sources update` on the CLI, `sources_update { confirm: true }` over MCP — so one story is portable across distributions and surfaces. `also: [{ message, call }]` adds further readings of the same emptiness, each with its own call. **Breaking:** the earlier `emptyRecovery.cli: "sources update"` string is retired. In your project config it is rejected with a `CONFIG_ERROR` naming the rename. In a package's `stories/*.json` — third-party data, often already built into a pack — it is carried forward instead: a string that is a verb path becomes `call: { verb }`, and anything else loses only the hint (named once under `doctor`'s `pack refs`); the noun keeps working either way.

A story half may also declare `useWhen` (the question it answers, as a bare clause: `"when asked which recipes exist"`) and `example` (one real call's params). Both are optional for packages; they become the tool's description, its `capabilities` entry and its `--help`.

Two consequences worth knowing:

- **Package- and config-declared nouns are dispatch-only.** `pragma --help` and shell completion read the static capability set without touching config or the pack, which is what keeps them fast. A noun that arrives from a package or from your config therefore runs, and `pragma capabilities` lists it, but `--help` and completion do not. The distribution's own stories are compiled into that static set, so they are advertised everywhere.
- **`pragma config show` reports pack declarations, not story bodies.** The bodies are SPARQL and the JSON payload is what MCP returns verbatim, so `packs` entries are shown as `{ name, source }` and the top-level `stories` array is omitted. `packs` is reported with its layer; `stories` carries an origin the payload has no value to attach it to. `pragma capabilities` lists the verbs the stories produce.

## `prefixes`: one field, two readers

`prefixes` is read twice, and only the distribution layer reaches both. Because a higher layer replaces the map rather than merging into it, a project that declares `prefixes` must declare every prefix its packs need, not only the new one.

1. **Every layer** — the prefixes a `pragma sources update` builds the pack with. They are applied over the namespaces harvested from the source graphs, so declaring one is how you settle a package that binds the same prefix to two IRIs.
2. **The distribution layer only** — the domain half of the CLI's compiled-in prefix map, which is what compacts IRIs in output *and* what expands a prefixed name you type (`pragma standard lookup cs:something`) before the query runs.

The second reader runs on the storeless `--help`/`__complete` fast path, which reads no config at all, so it can only ever see `pragma.conf.ts`. A project config that adds a prefix therefore changes the graph it builds, not how the CLI renders it. A fork that wants its own namespaces rendered and resolvable declares them in its own `pragma.conf.ts`.

## The distribution vocabulary (not a layer)

`pragma.conf.ts` has a second, named export beside its default config:

```ts
export const vocabulary = {
  altName: "ds:name",
  prompt: {
    type: "ds:Prompt",
    body: "ds:promptBody",
    argument: "ds:promptArgument",
    argName: "ds:argName",
    argRequired: "ds:argRequired",
  },
};
```

These are the domain terms the generic kernel reads a graph with: the property entities are addressed by (projected into the pack index as `altNames` enrichment by the index builder), and the shape of a prompt entity (which the `prompt_*` tools and the native MCP `prompts/*` surface both read).

It is **not** a config layer field, and cannot be set in a global or project config. Its readers are the storeless `--help`/`__complete` fast path and the pack index builder — neither can reach a config layer at all, so a layered field would be one you could set to no effect. A fork changes these values in its own `pragma.conf.ts` and rebuilds its binary; that, plus `prefixes` and the identity fields, is the whole of what makes the CLI *this* distribution.

Every term must be a prefixed name (`prefix:local`) whose prefix `prefixes` binds. They are interpolated into queries, where a bare absolute IRI is a parse error, so the CLI validates them at startup and refuses to run with a message naming the offending field rather than reporting an unreadable graph as an empty one.

Declaring the prompt shape is a read contract, not a claim that the graph has prompts. This distribution's graph currently carries none, so `pragma prompt list` is honestly empty.

## Reading and writing

Read the resolved config and its provenance:

```bash
pragma config show
```

The setters write to the **global** layer only — project configs are authored by hand. Each writable field is set with `config set <field> <value>`:

```bash
pragma config set tier apps/lxd
pragma config set channel experimental
pragma config set detail detailed
pragma config unset tier
```

- `tier` is a free string, and it is the DEFAULT TIER SCOPE every read of a tiered entity (blocks, modifier families, concepts) answers under: that tier and its ancestors, so `apps/lxd` reads `global`, `apps` and `apps/lxd`. Unset, those reads answer from the top-level tiers; set to `all`, from every tier. A per-call `--tier <name>` replaces it for one call, and every scoped answer states the scope it used. The value is written verbatim (the setter is storeless, so it cannot check the graph); a tier the pack does not carry is refused at the first tiered read, naming the ones it does. Clearing it is its own command, `config unset tier` — `none`, `default` and `-` are refused as values, because a string that doubles as a remove-marker cannot say "set the tier to the literal none".
- `channel` and `detail` are closed enums; `config unset` clears them too, so the built-in default (`normal` / `standard`) applies again.
- `config set <key> <value>` is the one-command form of the per-field setters — `key` is one of `tier`, `channel`, or `detail`, and `config unset <key>` is how any of the three is cleared.

See [getting-started.md](./getting-started.md) for the tier scope in use (the channel scopes no read — it selects the npm dist-tag `upgrade` and `info` check), the [configuration reference](./reference/config.md) for every field, and the [command reference](./reference/commands.md) for each setter's full signature.
