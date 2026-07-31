# Configuration model

pragma resolves its configuration from three layers. Each effective field carries its provenance, so `pragma config show` reports honestly which layer supplied every value.

## The three layers

From lowest to highest precedence:

1. **Built-in defaults** — the distribution config `pragma.conf.ts`, bundled into the binary (identity, default packs and the read stories they supply, generators, `channel: normal`, `detail: standard`).
2. **Global config** — `$XDG_CONFIG_HOME/pragma/config.json`. Machine-wide state, written by the config setters.
3. **Project config** — the nearest `pragma.config.ts`, walking up from the current directory. It is *evaluated* (not just parsed), and the result is content-hash cached under `$XDG_STATE_HOME/pragma/config-cache/<sha256>.json` so a re-run skips re-evaluation when the file is unchanged.

A higher layer overrides a lower one field-by-field. `packs` and `generators` replace rather than merge, so a project fully owns its source lists.

## Fields

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string (optional) | The distribution's display name (identity). |
| `help` | string (optional) | The distribution's one-line help blurb. |
| `colophon` | string (optional) | The distribution's colophon (markdown). |
| `issuesUrl` | URL string (optional) | Where the distribution's users report issues. |
| `tier` | string (optional) | Active design-system tier; absent means no tier filter. |
| `channel` | `normal` \| `experimental` \| `prerelease` | Release channel controlling component visibility. Defaults to `normal`. |
| `detail` | `summary` \| `standard` \| `detailed` (optional) | Default progressive-disclosure level. Defaults to `standard`. |
| `packs` | array | Semantic pack sources compiled by `pragma sources update`. Each entry is a bare npm name or `{ name, source, stories? }`. Replaces across layers. |
| `generators` | array | Scaffold generator sources (`{ name, source }` refs). Replaces across layers. |
| `stories` | array | Declarative read stories, not attached to any pack. See [Read stories](#read-stories). |
| `prefixes` | record | Namespace prefixes the pack is built with. They win every harvest, so this is what decides which IRI a prefix binds in the store and the index. See the note below on the distribution layer. |
| `completion` | object | Completion policy read at `setup completions` emit time. |

## Read stories

A **read story** is a noun described as data — a SPARQL `list`, a generated `lookup`, and the columns, filters and disclosure levels they project — which the CLI compiles into real commands and MCP tools. Nothing about the story itself is hand-written code; three shipped nouns keep one hand-written verb each alongside their story, listed in [architecture.md](./architecture.md).

Stories reach the CLI from three places, weakest to strongest:

| Tier | Where it is declared | Validation failure |
| --- | --- | --- |
| **distribution** | `packs[].stories` in the binary's own `pragma.conf.ts` | compile-time: `tsc` for the shape, plus the `parsePackDefinition` round-trip in `distribution.test.ts` for the grammar |
| **package** | `stories/*.json` shipped by a package the active pack was built from | the story is **ignored**, named on stderr and under `doctor`'s `pack refs` |
| **config** | `packs[].stories`, then the top-level `stories`, in your config | fatal `CONFIG_ERROR` |

Only your **config** may replace a noun the CLI already ships, and then only one that is itself story-backed — never a built-in command such as `config` or `doctor`. A **package** may add a noun the CLI does not have, and nothing else: a package story naming a shipped noun is ignored and reported, because replacing a noun replaces its whole module, and `block`, `token` and `tier` carry a hand-written verb (including the `token add-config` mutation) next to their story.

Within your config the top-level `stories` wins over `packs[].stories` for the same noun — declaring it in both is a refinement, not a conflict — and declaring the same noun twice inside your config is an error. Inside one package the last story file wins and `doctor` names the shadowed one.

Package stories are third-party data, so they are never fatal: a malformed or schema-invalid file is dropped, the rest of the package still works, and `pragma doctor` names each ignored file under `pack refs` (which stays `pass` — the pack does answer reads).

Two consequences worth knowing:

- **Package- and config-declared nouns are dispatch-only.** `pragma --help` and shell completion read the static capability set without touching config or the pack, which is what keeps them fast. A noun that arrives from a package or from your config therefore runs, and `pragma capabilities` lists it, but `--help` and completion do not. The distribution's own stories are compiled into that static set, so they are advertised everywhere.
- **`pragma config show` reports pack declarations, not story bodies.** The bodies are SPARQL and the JSON payload is what MCP returns verbatim, so `packs` entries are shown as `{ name, source }` and the top-level `stories` array is omitted. Provenance is still reported for both fields, and `pragma capabilities` lists the verbs the stories produce.

## `prefixes`: one field, two readers

`prefixes` is read twice, and only the distribution layer reaches both.

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

These are the domain terms the generic kernel reads a graph with: the property entities are addressed by (projected into the pack index as `altNames`, which is what a name completion offers and what `tier lookup` matches), and the shape of a prompt entity (which the `prompt_*` tools and the native MCP `prompts/*` surface both read).

It is **not** a config layer field, and cannot be set in a global or project config. Its readers are the storeless `--help`/`__complete` fast path and the pack index builder — neither can reach a config layer at all, so a layered field would be one you could set to no effect. A fork changes these values in its own `pragma.conf.ts` and rebuilds its binary; that, plus `prefixes` and the identity fields, is the whole of what makes the CLI *this* distribution.

Every term must be a prefixed name (`prefix:local`) whose prefix `prefixes` binds. They are interpolated into queries, where a bare absolute IRI is a parse error, so the CLI validates them at startup and refuses to run with a message naming the offending field rather than reporting an unreadable graph as an empty one.

Declaring the prompt shape is a read contract, not a claim that the graph has prompts. This distribution's graph currently carries none, so `pragma prompt list` is honestly empty.

## Renamed: `packages` → `packs`

The `packages` field was renamed to `packs`. A config layer that still declares `packages:` fails loudly: the schema detects the legacy key before its unknown-key stripping could hide it and throws a `CONFIG_ERROR` naming the rename. Rename the key — the entry shape is unchanged.

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
pragma config set tier none
```

- `tier` is a free string with meaningful reset sentinels: `none`, `default`, or `-` clear it.
- `channel` and `detail` are closed enums; reset them by setting their default (`normal` / `standard`).
- `config set <key> <value>` is the one-command form of the per-field setters — `key` is one of `tier`, `channel`, or `detail`, and the field's own reset rules still apply.

See [getting-started.md](./getting-started.md) for how the tier and channel scope the read commands, and the [command reference](./reference/commands.md) for each setter's full signature.
