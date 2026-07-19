# Skills

A *skill* is a `SKILL.md` file — a named, self-contained set of instructions an agent can load on demand. pragma discovers skills from the design-system packages and makes them available to both the CLI and any AI harness.

## Discover skills

Skill discovery is storeless — it reads `SKILL.md` files from the skill roots on disk, so it works before the store is built:

```bash
pragma skill list
pragma skill lookup docx
```

- `skill list` lists every discovered skill.
- `skill lookup <name>` prints one skill's metadata and full instructions.

## Install into a harness

Two paths install skills so an AI harness picks them up:

```bash
pragma setup skills
pragma sources update
```

- `pragma setup skills` symlinks the discovered skills into each detected AI harness.
- `pragma sources update` installs skills as part of building the store, so a normal update keeps a harness's skills current.

`pragma setup` (with no sub-command) runs the skills installer alongside the MCP, completions, and LSP installers as one wizard — preview it with `pragma setup --dry-run`.

## See also

- [MCP integration](./mcp-integration.md) — the tool and prompt surface an agent uses alongside skills.
- [Command reference](./reference/commands.md) — the full `skill` and `setup` signatures.
