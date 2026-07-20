# Configuration model

pragma resolves its configuration from three layers. Each effective field carries its provenance, so `pragma config show` reports honestly which layer supplied every value.

## The three layers

From lowest to highest precedence:

1. **Built-in defaults** — shipped in the binary (for example, `channel: normal`, `detail: standard`).
2. **Global config** — `$XDG_CONFIG_HOME/pragma/config.json`. Machine-wide state, written by the config setters.
3. **Project config** — the nearest `pragma.config.ts`, walking up from the current directory. It is *evaluated* (not just parsed), and the result is content-hash cached under `$XDG_STATE_HOME/pragma/config-cache/<sha256>.json` so a re-run skips re-evaluation when the file is unchanged.

A higher layer overrides a lower one field-by-field. `packages` is the exception: it **replaces** rather than merges, so a project fully owns its source list.

## Fields

| Field | Type | Notes |
| --- | --- | --- |
| `tier` | string (optional) | Active design-system tier; absent means no tier filter. |
| `channel` | `normal` \| `experimental` \| `prerelease` | Release channel controlling component visibility. Defaults to `normal`. |
| `detail` | `summary` \| `standard` \| `detailed` (optional) | Default progressive-disclosure level. Defaults to `standard`. |
| `packages` | array | Semantic package sources compiled by `pragma sources update`. Replaces across layers. |
| `stories` | array | Declarative read stories compiled at boot (experimental). |
| `prefixes` | record | Extra namespace prefixes merged over the built-in map. |
| `prompts` | record | Named prompt overrides (global machine state). |
| `completion` | object | Completion policy read at `setup completions` emit time. |

## Reading and writing

Read the resolved config and its provenance:

```bash
pragma config show
```

The setters write to the **global** layer only — project configs are authored by hand. Each writable field has its own verb, plus a one-command `set`:

```bash
pragma config tier apps/lxd
pragma config channel experimental
pragma config detail detailed
pragma config set tier none
```

- `tier` is a free string with meaningful reset sentinels: `none`, `default`, or `-` clear it.
- `channel` and `detail` are closed enums; reset them by setting their default (`normal` / `standard`).
- `config set <key> <value>` is the one-command form of the per-field setters — `key` is one of `tier`, `channel`, or `detail`, and the field's own reset rules still apply.

See [getting-started.md](./getting-started.md) for how the tier and channel scope the read commands, and the [command reference](./reference/commands.md) for each setter's full signature.
