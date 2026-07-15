# AGENTS.md — Working on `@canonical/pragma-cli`

Package-local notes that override or extend the repo-root `AGENTS.md` for the
pragma CLI. Read the root file first for toolchain, commits, and the pre-push
checklist.

## The interactive TUI (Ink) — a caveat

Pragma's interactive generator flow (`pragma create component`, `pragma create
package`) does **not** have its own prompt UI. On an interactive terminal it
renders **summon's** Ink UI — the colored prompt sequence, the operations recap,
and the "Proceed? · ctrl+o show contents" confirmation — so the two binaries
look and behave identically. This is deliberate: **we do not duplicate the TUI.**

How it is wired, and the caveats that come with it:

### 1. The UI is the shared `@canonical/cli-ui` package

The Ink components (`App`, `PromptSequence`, `FileTreePreview`,
`ExecutionProgress`, `Spinner`) live in **`packages/cli/ui`
(`@canonical/cli-ui`)**, a neutral shared library. Both `@canonical/summon` and
`@canonical/pragma-cli` depend on it; pragma imports `renderApp`/`App` from
`@canonical/cli-ui`. Do **not** reintroduce a dependency on the `@canonical/summon`
*binary* package for the UI, and do not duplicate these components into pragma —
change them once, in `cli-ui`, and both CLIs update.

Each component is documented by an anatomy-DSL Turtle sidecar under
`packages/cli/ui/src/anatomy/<Name>.ttl` (a `ds:Component` with a `ds:anatomyDsl`
node tree), mirroring how design-system components are described. Update the
sidecar when you change a component's rendered structure.

### 2. Ink breaks the standalone binary without a stub

`bun build --compile` (the `pragma` binary in `scripts/build.ts`) cannot bundle
Ink as-is: Ink statically imports `react-devtools-core` (only used when
`NODE_ENV !== "production"`), which is not resolvable inside the compiled binary.
The build registers a plugin that **stubs `react-devtools-core` to an empty
module**. If you add TUI code and the binary build starts failing with
`Could not resolve: "react-devtools-core"` (or the binary crashes at runtime with
`Cannot find package 'react-devtools-core'`), that stub is what handles it — do
not mark it `external` (a compiled binary can't resolve externals at runtime).

### 3. Interactive vs. non-interactive routing

`src/domains/create/renderGeneratorUi.ts` decides which front-end runs:

- **Interactive TTY** (`stdin` and `stdout` both TTY, none of `--yes`,
  `--dry-run`, `--undo`, `--llm`, `--format json`) → summon's Ink `App`.
- **Everything else** (CI/piped, `--yes`, machine output, preview/undo) → the
  shared, UI-free `executeGenerator` from `@canonical/cli-core`.

Keep every non-interactive path on `executeGenerator`: it owns the batch,
dry-run, and machine-readable (`--llm` / `--format json`) contracts, and it is
what tests and agents drive.

### 4. You cannot verify the Ink render in a non-interactive sandbox

Because the Ink path only runs on a real TTY, an automated/headless run (tests,
CI, an agent shell) **always takes the `executeGenerator` fallback** — you will
never see the Ink UI there, and that is correct. To validate TUI changes:

- Unit-test the **routing decision** (see `renderGeneratorUi.test.ts`) by
  stubbing `process.stdin.isTTY` / `process.stdout.isTTY` and asserting which
  branch is taken — do not try to assert on rendered Ink output.
- Verify the **binary builds and runs** a non-TUI command (`bun run build` then
  `./dist/pragma standard categories`).
- Ask a human to run `pragma create component react Foo` in a real terminal for
  the visual confirmation. State plainly that this step is unverified by the
  automated run rather than claiming the UI works.

## Other gotchas in this package

Things that are not obvious from the code and have each cost real debugging time.

### Source vs. compiled binary — always know which you are testing

The globally-installed `pragma` on `PATH` is the **compiled binary**
(`dist/pragma`), not the source. Editing `src/**` does **not** change it — you
must `bun run build` to refresh the binary. When iterating, run from source:
`bun src/bin.ts <args>`. Several bugs reproduce **only** in the compiled binary
(see completions below), so validate both when a change touches process spawning,
asset embedding, or module resolution.

### `@canonical/cli-core` resolves to its built `dist`, not source

pragma depends on `cli-core` via a workspace symlink whose `exports` point at
`dist/esm`. So **editing `packages/cli/core/src` has no effect on pragma until you
`bun run build` in `core`.** If a cli-core change "isn't taking", that is why.
Same pattern for the other `@canonical/*` workspace packages.

### `--dry-run` stubs read effects — it cannot preview read-driven logic

`dryRun` (in `@canonical/task`) walks the task tree and its combinators, but
resolves read effects against a mocked filesystem rather than the real one, so a
task whose control flow depends on reads produces a **misleading** preview. The
plain `dryRun` interpreter stubs `Exists → true` unconditionally; the virtual-fs
variant (`dryRunWithVirtualFs`, also used by undo) returns `true` only for paths
a *preceding* write created in the same walk. Either way the answer reflects the
mock, not the disk. This is why `pragma setup` must **execute for real** (via
`runSetupTask`) rather than render `executeGenerator`'s dry-run preview: under
dry-run, harness detection reads nothing real, so it reports "No AI harnesses
detected" even inside Claude Code. Rule: if a step branches on what it reads
(detection, "is it already installed?"), do not surface a dry-run preview as its
result.

### Completions run out-of-process and have two binary-only traps

Tab completion is served by a background socket server the client spawns. Two
failure modes reproduce **only in the compiled binary**, never from source:

- The client spawns the completions server as a subprocess. From source it runs
  `bun run <entryPath> _completions-server` (the entry file is on disk); inside a
  **compiled binary** that entry file does not exist, so it must spawn **the
  running executable itself** (`process.execPath`). `queryCompletions.ts` picks
  the right one — the trap is hard-coding `bun run bin.ts`, which starts nothing
  in the binary and every completion returns empty.
- The spawned server must be **`unref()`d**, or it keeps the client's event loop
  alive until its ~10 s idle timeout — every cold `Tab` appears to hang ~10 s and
  the persistent-server fast path never engages.

Also: shells forward the program name as the first completion word, so the
resolver strips a leading `pragma` (see `handleQuery`). Test completion logic by
driving `resolveCompletion`/`handleQuery` directly, not the socket.

### Output mode is auto-detected — tests and agents get condensed output

When `stdout` is not a TTY and no `--llm`/`--format` is given, output defaults to
condensed Markdown (`--llm` mode) — the shape an agent captures. So piped
commands (including in tests and CI) look different from an interactive terminal.
Override with `--format json`, explicit `--llm`, or `PRAGMA_NO_AUTO_LLM=1`.
Generators are exempt: auto-LLM shapes **formatting only** and never flips
`create` into dry-run (`GlobalFlags.autoLlm`).

### Coverage gates differ by package

`@canonical/cli-core` enforces **100%** coverage (all four metrics); adding an
untested branch there **fails the suite**. `@canonical/pragma-cli` enforces
**80%**. When you add a branch to cli-core, add the test in the same change.

### `bun build --compile` cannot bundle everything

The standalone binary embeds assets via glob in `scripts/build.ts` and needs
plugins/stubs for things a bundler can't resolve (the `react-devtools-core` stub
for Ink; the story-assets plugin for `stories/*.json`). Large single-`write`s to
`stdout` can also segfault the Bun runtime, which is why cli-core chunks stdout
output (`writeChunked`, 4 KiB). If a big-output command crashes only as the
binary, that guard is the relevant machinery.

### Some commands intentionally skip booting the ke store

`resolveCommandKind` lists `STORE_SKIP_COMMANDS` (`setup`, `mcp`, `create`,
`graphql`, `trace`, `capabilities`, `update-refs`). These must never require the
store — they run before it boots. If you make one of them depend on the graph,
you will either couple it to installed packages or break it when they are absent;
move it out of the skip set instead.

### Check the way CI does — use the package script

Run **`bun run check`** (biome + `tsc` + webarchitect, the full gate) and
**`bun run check:fix`** to apply fixes. Use the package scripts — not an ad-hoc
`bunx biome` / `bunx --bun biome`, which can resolve a different biome and
silently skip formatting that CI then rejects, and skips the type-check and
architecture rules entirely.
