# Setup and health

Reads work from the moment the package is installed — nothing on this page is required before your first `pragma block lookup`. What `pragma setup` adds is the environment around them: tab completion for your shell, the MCP registration that gives AI agents the same graph, agent skills, and the LSP extension. `pragma doctor` then verifies all of it, and names the fix for anything broken.

## The wizard

`pragma setup` is one wizard over four installers:

| Step | What it installs | Scope |
|---|---|---|
| Shell completions | The tab-completion script for your shell — zsh, bash, or fish, detected from `$SHELL` | global |
| Terrazzo LSP | The Terrazzo LSP VS Code extension, installed through `bunx` | global |
| MCP registration | A pragma MCP server entry in each detected AI harness's config file | project and global |
| Skills | A symlink for each discovered agent skill, into each harness's skills directory | project |

```bash
pragma setup
```

The run has three phases:

1. **Detection, first and for real.** Which shell you run, which AI harnesses are present, which config files already carry a pragma entry. A step the wizard cannot detect a target for is not offered — an unrecognized `$SHELL` means no completions step, no error.
2. **Selection and recap.** On a terminal you pick the steps from a multiselect, then review a recap of the exact effects — every file write, symlink, and command — before anything is applied.
3. **Apply**, with live progress.

Non-interactively — `--yes`, CI, or any run without a terminal — every offered step runs with its defaults, no questions asked.

Re-running is safe. Each installer reads the prior state of what it would write: a file that already matches is skipped and reported unchanged, one that drifted is updated, one that is missing is created. `pragma setup` after an upgrade is the supported way to refresh everything at once.

## Project scope and global scope

Setup writes into two **bands** of configuration: the **project** band (files in the repository, like `.mcp.json`) and the **global** band (files in your home directory). By default a run covers both; `--scope project|global|both` narrows it, with two shorthands:

```bash
pragma setup --local
pragma setup --global
```

`--local` covers only the project band, `--global` only the user/home band.

Scope narrows what the wizard offers, not only where it writes: completions and the LSP live in the global band, so `--local` omits them; skills live in the project band, so `--global` omits those; MCP spans both, so its target files are filtered to the band you chose.

The same two bands carry pragma's own configuration — `pragma config show` prints the resolved config and marks which layer supplied each field:

```bash
pragma config show
```

## Preview with `--dry-run`

Every setup command is plan-first: `--dry-run` prints the exact effects and applies nothing, and `--undo` reverses a previous apply. From a real run, abridged — the cut is marked `⋮` and paths are shortened:

```console
$ pragma setup --dry-run
Dry run — planned effects:
  - Write file: ~/.local/share/bash-completion/completions/pragma (8320 bytes)
  - Log [info]: To activate, restart your shell (bash-completion auto-loads the script).
  - Execute: bunx @canonical/terrazzo-lsp-extension
  - Write file: .mcp.json (198 bytes)
  - Log [info]: [project] pragma MCP server → .mcp.json (Claude Code)
  - Write file: .gemini/settings.json (198 bytes)
  - Symlink: .claude/skills/component-specifier → ~/.local/share/pragma/skills/component-specifier
  ⋮
```

## One step at a time

Each installer is also a command of its own:

```bash
pragma setup mcp
pragma setup completions
pragma setup skills
pragma setup lsp
```

**`setup mcp`** registers the pragma MCP server in every AI harness it detects — Claude Code, OpenCode, Gemini CLI, and others. Each write targets one config file; where two harnesses share a file, each one's entries are preserved. Detection classifies every target file up front — no pragma entry yet, already configured, or drifted — and on a terminal an already-configured file is deselected by default, so a re-run offers to fix drift rather than rewrite what is current. Every run opens by naming what it detected — detected targets only, or the whole table under `--verbose` — and where there is more than one config file it then asks which of them to configure, each listed with its own state (`add`, `update`, `unchanged`). Pressing enter keeps the defaults, which configure every file that needs it. `--scope`, `--global`, and `--local` apply here too:

```bash
pragma setup mcp --scope project
```

**`setup completions`** installs the completion script at your shell's standard path. It is detection-only — the shell comes from `$SHELL`, and a byte-identical script already in place is left alone. Restart your shell to activate.

**`setup skills`** symlinks each discovered skill into each harness's skills directory (`.claude/skills/`, `.agents/skills/`, …), reporting every link as created, skipped, or replaced. Run directly with nothing to link, it says so rather than pretending.

**`setup lsp`** ensures the Terrazzo LSP VS Code extension is installed, via `bunx` — it needs Bun on your `PATH`, and tells you to install it if missing.

## `pragma doctor`

`pragma doctor` runs its health checks and prints pass / fail / skip, each failure with the command that fixes it. It is storeless by default — the one store check boots lazily and a broken store never aborts the run — so it works before you have built anything.

```console
$ pragma doctor
## Doctor

- ✓ **Node version**: v24.3.0
- ✓ **pragma version**: v0.34.0 (installed via bun (global))
- ✓ **pragma config**: no project config — global config active (~/.config/pragma/config.json)
- ✓ **pack refs**: embedded snapshot @ @canonical/design-system@git:41c31b3…, … — 550 entities
- ✓ **ke store**: 550 entities in 388ms
- ○ **MCP commands**: no MCP configs found
### Global

- ✗ **Shell completions**: resolver OK; bash script at ~/.local/share/bash-completion/completions/pragma is out of date
  - _fix:_ `pragma setup completions`
### Project

- ✗ **MCP configured**: detected Claude Code, OpenCode, Gemini CLI but pragma not configured
  - _fix:_ `pragma setup mcp`
- ✗ **Skills symlinked**: missing for Claude Code, OpenCode, Gemini CLI
  - _fix:_ `pragma setup skills`

_5 passed, 3 failed, 1 skipped_
```

Abridged — long paths are shortened to `~` and one pack ref is cut.

The report groups banded findings under **Global** and **Project**, matching setup's two scopes — a failure's section tells you which band to re-run setup in.

| Check | What it verifies | The fix it names |
|---|---|---|
| Node version | The runtime is a supported major (20+) | Install a supported Node.js |
| pragma version | Reports version and install provenance | — (informational) |
| pragma config | A project or global config exists | `pragma config set …` |
| pack refs | The pack answering reads is the one your config asks for — a project that declared its own packs but never built them fails here | `pragma sources update` |
| ke store | The store boots; reports entity count and boot time | `pragma sources update` |
| Shell completions | The installed script exists, is current, and is wired into the shell | `pragma setup completions` |
| MCP configured | Each detected harness has a pragma server entry | `pragma setup mcp` |
| MCP commands | Every registered MCP command resolves on `PATH` — a stale entry breaks every agent session that tries to boot it | Install the missing command, or remove the entry |
| Skills symlinked | The discovered skills are linked into each harness | `pragma setup skills` |

Doctor always exits 0 — failures live in the report (and in the `failed` count of `--format json`), so scripts read the data rather than the exit code:

```bash
pragma doctor --format json
```

## Version and updates

`pragma info` reports the version, install provenance, the resolved configuration, the entity total, and whether a newer release exists; `pragma upgrade` updates the CLI itself using whichever package manager installed it:

```bash
pragma info
pragma upgrade
```

## Where next

- [The design system graph](./design-system.md) — what all of this gives you access to.
- [MCP integration](./mcp-integration.md) — what the registered server offers an agent.
- [Command & tool reference](./reference/index.md) — every setup and doctor flag.
