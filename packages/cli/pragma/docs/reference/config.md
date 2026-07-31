# Configuration reference

Every field a `pragma` config layer may declare. Generated from the config type — do not edit by hand. See [config-model.md](../config-model.md) for the authoring guide.

## Layers

From lowest to highest precedence:

1. **Built-in defaults** — the distribution config compiled into the binary.
2. **Global config** — `$XDG_CONFIG_HOME/pragma/config.json`, written by `pragma config set`.
3. **Project config** — the nearest `pragma.config.ts`, walking up from the working directory.

A higher layer REPLACES a lower one field by field. No field merges — not `packs`, not `prefixes`, not `completion`. A project declaring one prefix therefore replaces the distribution's whole prefix map, including the namespaces its own packs are built with; declare every prefix you need, not only the new one.

## Fields

The `Type` column is prose; the field set and each field's optionality are checked against the validator.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string (optional) | Distribution-only — see below. The binary's own name, read from the distribution config at module load. |
| `help` | string (optional) | Distribution-only — see below. The one-line blurb on the front door and in the MCP handshake. |
| `colophon` | string (optional) | Distribution-only — see below. Markdown, rendered by `colophon`. |
| `issuesUrl` | URL string (optional) | Distribution-only — see below. Where the first-run note asks users to report problems. |
| `tier` | string (optional) | Active tier path; absent means no tier filter. Set it with `config set tier <path>`; `none`, `default` or `-` clear it. |
| `channel` | `normal` \| `experimental` \| `prerelease` (optional) | Release channel controlling entity visibility. Defaults to `normal`. Set it with `config set channel <name>`. |
| `detail` | `summary` \| `standard` \| `detailed` (optional) | Default progressive-disclosure level. Defaults to `standard`. Set it with `config set detail <level>`. |
| `packs` | array (optional) | Semantic pack sources built by `sources update`. Each entry is a bare npm name or `{ name, source, stories? }`; `stories` are read stories the pack supplies, in the pack grammar. |
| `generators` | array (optional) | Scaffold generator refs (`{ name, source }`). NOTHING reads `source` today: the `create` verbs resolve their generators statically. Declaring it changes only what `config show` prints. |
| `stories` | array (optional) | Read stories not attached to any pack, in the pack grammar. Compiled at dispatch, and they win over the same noun declared under `packs[].stories`. |
| `prefixes` | record (optional) | Namespace prefixes the pack is built with — they win every harvest, so this decides which IRI a prefix binds in the store and the index. Only the distribution layer additionally seeds the compiled-in display/expansion map, which is read where no config layer exists. |
| `completion` | object (optional) | Completion policy read when `setup completions` emits a script — `minChars`, `caseSensitive`, and a per-noun `families` opt-out. It is the one merged field with NO provenance: `config show` does not report it. |

## Distribution-only fields

`name`, `help`, `colophon` and `issuesUrl` are read from the distribution config when the program loads, because the surfaces that need them — `--help`, shell completion, the MCP handshake, the first-run note — run before or without the config layer. The validator ACCEPTS them in a global or project layer, and they have **no effect there and are not reported** by `config show`. Changing them means forking: edit the distribution config and rebuild the binary.

## Fields with no provenance

`completion` is merged through the layers but carries no origin, so `config show` does not print it. Every other field above is reported with the layer that supplied it.

## Renamed: `packages` → `packs`

The `packages` field was renamed to `packs`. A layer that still declares `packages:` fails loudly: the rename is detected before the schema's unknown-key stripping could hide it, and the error names it. Rename the key — the entry shape is unchanged.

## Reading and writing

`pragma config show` prints the resolved config and each field's layer. `pragma config set <key> <value>` writes to the **global** layer only — project configs are authored by hand. Both are documented in the [command reference](./commands.md).
