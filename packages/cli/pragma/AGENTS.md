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

### 1. The UI lives in `@canonical/summon`, reached via its `./ui` subpath

The Ink components (`App`, `PromptSequence`, `FileTreePreview`,
`ExecutionProgress`, `Spinner`) live in `packages/cli/summon/src/components`.
`@canonical/summon` exposes them through a dedicated entry point:

```jsonc
// packages/cli/summon/package.json
"exports": { "./ui": { "types": "./dist/src/ui/index.d.ts",
                       "import": "./dist/src/ui/index.js" } }
```

`packages/cli/pragma` therefore **depends on the `@canonical/summon` binary
package** and imports `renderApp`/`App` from `@canonical/summon/ui`.

> **Known shortcut / tech debt.** This makes the *binary* package double as a
> library, which is a backwards dependency (an app importing a CLI). The intended
> end-state is a neutral `@canonical/summon-ui` package that both `@canonical/summon`
> and pragma depend on. Until then, keep the coupling to the single `./ui` entry —
> do not reach into `@canonical/summon`'s other internals.

### 2. Summon must emit declarations

`@canonical/summon` builds with `declaration: true` **specifically so pragma can
type-check against the emitted `.d.ts`**, not against summon's `.tsx` source.
Summon's source uses looser compiler settings than pragma; if pragma resolves
summon's types from source it fails on summon-internal type errors that summon's
own `tsc` tolerates. If you touch summon's build config, keep `declaration: true`.

### 3. Ink breaks the standalone binary without a stub

`bun build --compile` (the `pragma` binary in `scripts/build.ts`) cannot bundle
Ink as-is: Ink statically imports `react-devtools-core` (only used when
`NODE_ENV !== "production"`), which is not resolvable inside the compiled binary.
The build registers a plugin that **stubs `react-devtools-core` to an empty
module**. If you add TUI code and the binary build starts failing with
`Could not resolve: "react-devtools-core"` (or the binary crashes at runtime with
`Cannot find package 'react-devtools-core'`), that stub is what handles it — do
not mark it `external` (a compiled binary can't resolve externals at runtime).

### 4. Interactive vs. non-interactive routing

`src/domains/create/renderGeneratorUi.ts` decides which front-end runs:

- **Interactive TTY** (`stdin` and `stdout` both TTY, none of `--yes`,
  `--dry-run`, `--undo`, `--llm`, `--format json`) → summon's Ink `App`.
- **Everything else** (CI/piped, `--yes`, machine output, preview/undo) → the
  shared, UI-free `executeGenerator` from `@canonical/cli-core`.

Keep every non-interactive path on `executeGenerator`: it owns the batch,
dry-run, and machine-readable (`--llm` / `--format json`) contracts, and it is
what tests and agents drive.

### 5. You cannot verify the Ink render in a non-interactive sandbox

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
