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
| `colophon` | `{ markdown, summary? }` (optional) | Distribution-only — see below. The distribution's own colophon section: `colophon` renders it first, titled with the binary's name, then each active pack's own `colophon`. Both are Markdown BODIES with no leading heading — the renderer supplies one. `summary` is what `--format llm` emits; without it an agent is handed the full body. Declare none and the command reports only the packs' sections. |
| `issuesUrl` | URL string (optional) | Distribution-only — see below. Where the first-run note asks users to report problems. |
| `tier` | string (optional) | Active tier path; absent means no tier filter. Set it with `config set tier <path>`; `none`, `default` or `-` clear it. |
| `channel` | `normal` \| `experimental` \| `prerelease` (optional) | Release channel controlling entity visibility. Defaults to `normal`. Set it with `config set channel <name>`. |
| `detail` | `summary` \| `standard` \| `detailed` (optional) | Default progressive-disclosure level. Validated: a layer declaring anything else fails at load with a `CONFIG_ERROR` naming the file and the three levels, rather than being reported as declared and silently rendered at `standard`. Set it with `config set detail <level>`, which rejects anything else. |
| `packs` | array (optional) | Semantic pack sources built by `sources update`. Each entry is a bare npm name or `{ name, source, stories? }`; `stories` are read stories the pack supplies, in the pack grammar. |
| `generators` | array (optional) | Scaffold generator refs (`{ name, source }`). Distribution-only in practice: the DISTRIBUTION layer's declaration is the single authoring point for the package names the `create` verbs BIND, in declaration order. It is not the only place a fork edits, and the build says so: `pickGenerator.ts` must repeat those same names as LITERAL import specifiers — `bun build --compile` bundles only statically analysable ones — and `bun run build` fails naming the noun, the bound name and the specifier when the two disagree. Change a generator and you change both together. `source` is read by the BUILD, not at runtime — a declared `npm:` ref must name its own entry and carry the range the binary actually links, or the build fails. A global or project layer declaring `generators` changes only what `config show` prints. |
| `stories` | array (optional) | Read stories not attached to any pack, in the pack grammar. Compiled at dispatch, and they win over the same noun declared under `packs[].stories`. |
| `prefixes` | record (optional) | Namespace prefixes the pack is built with — they win every harvest, so this decides which IRI a prefix binds in the store and the index. Every surface uses the compiled-in display/expansion map to compact and expand prefixed names; only the DISTRIBUTION layer seeds it, because it is also read on the storeless fast path, before any config layer exists. |
| `completion` | object (optional) | Completion policy read when `setup completions` emits a script: `minChars` and a per-noun `families` opt-out — the two fields something reads. It is the one field `config show` carries with NO origin at all. |

## Distribution-only fields

`name`, `help`, `colophon` and `issuesUrl` are all read from the distribution config when the program loads, because the surfaces that need them run before or without the config layer: `--help`, shell completion, the MCP handshake and the first-run note for the three strings, and the leading section of `pragma colophon` for `colophon`. The validator ACCEPTS all four in a global or project layer, and they have **no effect there and are not reported** by `config show` — with one hard edge: a layer declaring `colophon` as a bare STRING (the pre-v2 byline form) is rejected at load rather than accepted and ignored, because the shape changed. The remedy it prints is DELETE the line — writing the new shape in a global or project layer would be accepted and still ignored, so only the distribution layer's own error asks for a rewrite. Changing any of the four means forking: edit the distribution config and rebuild the binary. The distribution config's `vocabulary` export is not a config field at all — no layer may declare it, and a fork changes it in the same file it changes `name` in.

## What `config show` reports

`pragma config show` prints `tier`, `channel`, `detail`, `packs`, `generators` — those and only those — each with the layer that supplied it. The rest resolve without being reported that way: `prefixes` and `completion` appear only in the `--format json` payload, `prefixes` with an origin and `completion` with none; `stories` carries an origin whose value the payload leaves out; and the four distribution-only fields above carry neither. The plain and llm forms print those rows and nothing else; `--format json` returns the resolved config and the origin map whole.

## Renamed: `packages` → `packs`

The `packages` field was renamed to `packs`. A layer that still declares `packages:` fails loudly: the rename is detected before the schema's unknown-key stripping could hide it, and the error names it. Rename the key — the entry shape is unchanged.

## Removed: `completion.caseSensitive`

`completion.caseSensitive` was validated and read by nothing — `setup completions` reads only `minChars` and `families`, and no config layer has ever reached the completion path's case folding. It is removed, and a layer that still declares it fails loudly for the same reason the rename above does: unknown keys are stripped for forward compatibility, so the removal is detected BEFORE validation and the error names the file and the line. Delete the line. Case folding is decided per STORY, by the pack grammar's `complete.caseSensitive` — a different, live field on the autocomplete heuristic, defaulting to insensitive, and untouched by this removal.

## Reading and writing

`pragma config show` prints the resolved config and each field's layer. `pragma config set <key> <value>` writes to the **global** layer only — project configs are authored by hand. Both are documented in the [command reference](./commands.md).
