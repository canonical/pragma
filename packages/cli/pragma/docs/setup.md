# Setup and health

Reads work from the moment the package is installed — nothing on this page is required before your first `pragma block lookup`. What `pragma setup` adds is the environment around them: tab completion for your shell, the MCP registration that gives AI agents the same graph, agent skills, and the LSP extension. `pragma doctor` then verifies all of it, and names the fix for anything broken.

## The wizard

`pragma setup` is one wizard over five installers:

| Step | What it installs | Where |
|---|---|---|
| `config` | Your global config file, filled in with the defaults | global |
| `completions` | The TAB-completion script for the shell you are running — zsh, bash, or fish | global |
| `lsp` | The Terrazzo design-token extension, into your VS Code-family editors | global |
| `mcp` | A pragma MCP server entry in each AI harness config file | global and local project |
| `skills` | A symlink for each installed skill, into every harness that reads them | global and local project |

```bash
pragma setup
```

The run has three phases:

1. **Detection, first and for real.** Which shell you run, which AI harnesses are present, which config files already carry a pragma entry. A step the wizard cannot detect a target for is not offered — an unrecognized `$SHELL` means no completions step, no error.
2. **Selection and recap.** On a terminal you pick the steps from a multiselect, then review a recap of the exact effects — every file write, symlink, and command — before anything is applied.
3. **Apply**, with live progress.

Non-interactively — `--yes`, CI, or any run without a terminal — every offered step runs with its defaults, no questions asked.

Re-running is safe. Each installer reads the prior state of what it would write: a file that already matches is skipped and reported unchanged, one that drifted is updated, one that is missing is created. `pragma setup` after an upgrade is the supported way to refresh everything at once.

## Global and local project

Setup writes into two places: **global** — files in your home directory, which is the default — and the **local project**, meaning files in the repository you are standing in, like `.mcp.json`. `--scope project|global|both` chooses between them, with two shorthands:

```bash
pragma setup --local
pragma setup --global
```

`--local` configures this project only; `--global` configures your home directory.

Scope narrows what the wizard offers, not only where it writes: completions and the editor extension are global only, so `--local` leaves them out and says so on their rows; project skills are per-project, so `--global` leaves those out; MCP works either way, so its config files are filtered to the scope you chose.

The same two places carry pragma's own configuration — `pragma config show` prints the resolved config and marks which layer supplied each field:

```bash
pragma config show
```

## Preview with `--dry-run`

Every setup command is plan-first: `--dry-run` prints the plan and applies nothing, and `--undo` reverses a previous apply. From a real run, with paths shortened against the two roots the header names:

```console
$ pragma setup --dry-run
Setup plan — global (home: ~ · project: /home/you/src/app)

  config       install    ~/.config/pragma/config.json
  completions  install    zsh → ~/.zfunc/_pragma
  lsp          no change  codium — VSCodium
  mcp          install    ~/.claude.json · ~/.config/opencode/opencode.json · ~/.gemini/settings.json
  skills       link       9 skills → 2 folders (~/.claude/skills, ~/.agents/skills)

Dry run — nothing applied.
```

The middle column is what the row will do. When nothing will happen it says so — `no change` for something already correct, `nothing to do` for something there is nothing to act on — and the column beside it says why.

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

**`setup skills`** links each installed skill into each harness's skills folder (`.claude/skills/`, `.agents/skills/`, …), reporting every link as created, skipped, or replaced. With nothing to link it says so — and says where skills come from, so the row is not a dead end.

**`setup lsp`** installs the Terrazzo design-token extension into your VS Code-family editors. On a machine with no such editor on `PATH` the row skips and says which CLIs it looked for, rather than offering a command for a binary you do not have.

## `pragma doctor`

`pragma doctor` runs its checks and prints one row each, with the next step inline wherever there is one. It needs no store — the one store check boots lazily and a broken store never aborts the run — so it works before you have built anything.

```console
$ pragma doctor
## Doctor

- ✓ **Node version**: v24.3.0
- ✓ **pragma version**: v0.35.0 (installed via bun (global))
- ✓ **pack refs**: shipped with the CLI — 4 packs, 657 entities · run `pragma sources update` to build from your own configured packs instead
- ✓ **store**: 657 entities in 158ms
### Global

- ✓ **config**: ~/.config/pragma/config.json — valid
- ◇ **completions**: pragma answers `<TAB>`; the zsh script is not installed
  - _fix:_ `pragma setup completions`
- ✓ **lsp**: installed in VSCodium
- ◇ **mcp**: not registered in any of 3 config files
  - ◇ ~/.claude.json: not registered
  - _fix:_ `pragma setup mcp`
- ✓ **harnesses**: 3 detected · 0 registered
  - ◇ Claude Code: detected, not registered — ~/.claude.json
### Local project

- ○ **mcp**: not registered for this project — per-project registration is opt-in
- ○ **skills**: nothing to link — this project holds no skills (./.pragma/skills does not exist)
  - _next:_ add a skill at ./.pragma/skills/<name>/SKILL.md, then run this again

_8 passed, 0 failed, 2 available, 2 skipped_
```

Abridged — long paths are shortened to `~` and some sub-items are cut.

Four tiers, not two. **pass** is fine, **fail** is broken and worth your attention, **available** is an optional integration you have not switched on yet, and **skip** is a row with nothing to act on — a fresh install is healthy with several `available` rows, and counting those as failures would only teach you that the failure count is noise. Every fail and available names the command that settles it under `fix:`; a skip that has a real next step on this machine names it under `next:`.

The report groups its findings under **Global** and **Local project**, matching setup's two scopes — a failing row's section tells you which of the two to re-run setup in.

| Row | What it checks | What it names |
|---|---|---|
| Node version | The runtime is a supported major (20+) | Install a supported Node.js |
| pragma version | The version, and how it was installed | — (informational) |
| pack refs | The pack answering reads is the one your config asks for — a project that declared its own packs but never built them fails here | `pragma sources update` |
| store | The store boots; reports entity count and boot time | `pragma sources update` |
| config | The global config file exists and parses | `pragma setup config` |
| completions | The installed script exists, is current, and is wired into the shell | `pragma setup completions` |
| lsp | The Terrazzo extension is present in the editors on your `PATH` | `pragma setup lsp` |
| mcp | Each config file carries a current pragma entry, and the command it names is on `PATH` | `pragma setup mcp` |
| skills | Every skill is linked into each harness that reads them | `pragma setup skills` |
| harnesses | A listing, not a verdict: which AI harnesses are on this machine, and whether pragma is registered in each | — (the `mcp` row owns the fix) |

Every row except `harnesses` is named after the setup target that repairs it, so the row name is also the argument you type: `✗ mcp` sits above `fix: pragma setup mcp`.

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
