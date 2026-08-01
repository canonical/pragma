# Configuration reference

Every field a `pragma` config layer may declare. Generated from the config type — do not edit by hand. See [config-model.md](../config-model.md) for the authoring guide.

## Layers

From lowest to highest precedence:

1. **Built-in defaults** — the distribution config compiled into the binary.
2. **Global config** — `$XDG_CONFIG_HOME/pragma/config.json`, written by `pragma config set`.
3. **Project config** — the nearest `pragma.config.ts` (or `pragma.config.js`, the compiled-binary fallback), walking up from the working directory.

A higher layer REPLACES a lower one field by field. No field is deep-merged — not `packs`, not `prefixes`, not `completion`. A project declaring one prefix therefore replaces the distribution's whole prefix map, including the namespaces its own packs are built with; declare every prefix you need, not only the new one.

## Fields

The `Type` column is prose; the field set and each field's optionality are checked against the validator.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string (optional) | Distribution-only — see below. The binary's own name, read from the distribution config at module load. |
| `help` | string (optional) | Distribution-only — see below. The one-line blurb on the front door and in the MCP handshake. |
| `colophon` | object (optional) | Distribution-only — see below. The toolchain's own story, rendered first by the `colophon` verb and titled with the distribution's name: `{ markdown, summary? }`, both Markdown bodies with no leading H1 (`summary` is the condensed `--format llm` form). Declared content, not code — a fork edits it to tell its own story. |
| `issuesUrl` | URL string (optional) | Distribution-only — see below. Where the first-run note asks users to report problems. |
| `tier` | string (optional) | Accepted by the validator and SCOPES NOTHING: since the block list became declared content, no read filters by tier — the value is only reported by `config show` and `info`. Set it with `config set tier <path>`; `none`, `default` or `-` clear it. |
| `channel` | `normal` \| `experimental` \| `prerelease` (optional) | Selects the npm dist-tag `upgrade` and `info` check the registry with. It no longer scopes graph reads — no read filters by channel. Defaults to `normal`. Set it with `config set channel <name>`. |
| `detail` | `summary` \| `standard` \| `detailed` (optional) | Default progressive-disclosure level. A closed enum, like `channel`: any other value fails at load with a `CONFIG_ERROR` naming the file and the three levels. Set it with `config set detail <level>`. |
| `packs` | array (optional) | Semantic pack sources built by `sources update`. Each entry is a bare npm name or `{ name, source, stories? }`; `stories` are read stories the pack supplies, in the pack grammar. |
| `stories` | array (optional) | Read stories not attached to any pack, in the pack grammar. Compiled at dispatch, and they win over the same noun declared under `packs[].stories`. |
| `prefixes` | record (optional) | Namespace prefixes the pack is built with — they win every harvest, so this decides which IRI a prefix binds in the store and the index. Every surface uses the compiled-in display/expansion map to compact and expand prefixed names; only the DISTRIBUTION layer seeds it, because it is also read on the storeless fast path, before any config layer exists. |
| `completion` | object (optional) | Completion policy read when `setup completions` emits a script: `minChars` and a per-noun `families` opt-out. It is the one field `config show` carries with NO origin at all. |

## Distribution-only fields

`name`, `help` and `issuesUrl` are read from the distribution config when the program loads, because the surfaces that need them — `--help`, shell completion, the MCP handshake, the first-run note — run before or without the config layer. `colophon` is read from the same file at render time: the `colophon` verb narrates whatever the distribution declares there. The validator ACCEPTS all four in a global or project layer, and they have **no effect there and are not reported** by `config show`. Changing them means forking: edit the distribution config and rebuild the binary. The distribution config's `vocabulary` export is not a config field at all — no layer may declare it, and a fork changes it in the same file it changes `name` in.

## What `config show` reports

`pragma config show` prints `tier`, `channel`, `detail`, `packs` — those and only those — each with the layer that supplied it. The rest resolve without being reported that way: `prefixes` and `completion` appear only in the `--format json` payload, `prefixes` with an origin and `completion` with none; `stories` carries an origin whose value the payload leaves out; and the four distribution-only fields above carry neither. The plain and llm forms print those rows and nothing else; `--format json` returns the resolved config and the origin map whole.

## Renamed: `packages` → `packs`

The `packages` field was renamed to `packs`. A layer that still declares `packages:` fails loudly: the rename is detected before the schema's unknown-key stripping could hide it, and the error names it. Rename the key — the entry shape is unchanged.

## Removed: `generators`

The `generators` field was removed: it was accepted by the validator, layered, and read by nothing — the `create` verbs resolve their generators statically (a compiled binary can only run generators it was linked with), so declaring it changed only what `config show` printed. A layer that still declares it fails loudly at load with an error naming the removed field; delete it. Declared generators may return as a working feature in a later program.

## Removed: `completion.caseSensitive`

The `completion.caseSensitive` field was removed: it was accepted by the validator and read by nothing — completion matching is declared per parameter by the capability grammar, never configured. A layer that still sets it fails loudly at load with an error naming the removed field; delete the key. `completion.minChars` and `completion.families` are unchanged.

## Reading and writing

`pragma config show` prints the resolved config and each field's layer. `pragma config set <key> <value>` writes to the **global** layer only — project configs are authored by hand. Both are documented in the [command reference](./commands.md).
