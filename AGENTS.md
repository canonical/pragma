# AGENTS.md — Working on a Pragma PR

Guidance for AI agents (and humans) contributing to `canonical/pragma`. For deeper
setup and monorepo mechanics see [`old/CONTRIBUTING.md`](old/CONTRIBUTING.md); this
file is the PR workflow contract.

## Toolchain

- **Bun is required** and is the canonical package manager/runner (`bun install`,
  `bun run <script>`). Node.js 20+ must also be present (the floor `pragma doctor`
  enforces and `old/CONTRIBUTING.md` documents); avoid Node 23.
- **npm appears only for first-time package publishing** (`npm publish --access public`
  from inside a new package dir) — never for day-to-day dev. Don't use `npm install`.

## Commits

- **Conventional / semantic commits**, enforced. CI (`.github/workflows/pr-lint.yml`)
  rejects a PR whose **title** is not Conventional-Commits compliant, so the title
  needs a `type(scope): subject` form, e.g. `feat(pragma): …`, `fix(summon): …`,
  `docs(tokens): …`, `chore(deps): …`, `refactor(cli): …`.
- **Keep commits atomic.** One logical change per commit; the diff should be reviewable
  on its own and tell a single story. Bundling unrelated items into one commit/PR is
  allowed but should be **rare** and called out in the PR body (a "drive-by" line).
- The PR also needs one of these **labels**: `Feature 🎁`, `Breaking Change 💣`,
  `Bug 🐛`, `Documentation 📝`, `Maintenance 🔨`.
- The release CHANGELOG is Lerna-generated from commit history — write commit subjects
  for the changelog reader, not just yourself.

## Branches & worktrees (local development)

- **Branch names follow `type/semantic-description`** — the `type` matches the
  conventional-commit types (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, …) and
  the description is kebab-case and meaningful, e.g. `feat/minor-cli-improvements`,
  `fix/storybook-subpath-imports`. Every branch carries a `/`.
- **Work in a git worktree, not by switching the main checkout.** Create one per branch
  under `.claude/worktrees/`. Name the worktree directory after the branch, with the
  `/` replaced by `-` (a `/` can't be a single path segment). So:

  ```bash
  # branch feat/minor-cli-improvements  →  worktree dir feat-minor-cli-improvements
  git worktree add -b feat/minor-cli-improvements \
    .claude/worktrees/feat-minor-cli-improvements origin/main
  ```

  This keeps each line of work isolated, lets several proceed in parallel, and leaves the
  main checkout untouched. Branch from an up-to-date `origin/main`. Note a fresh worktree
  has no `node_modules` — run `bun install` inside it before the first `check`/`test`.

## Where to run commands

- **Before pushing, always run the full gate from the repo ROOT.** Root scripts fan out
  across every affected package via Lerna (with Nx caching), so the root is the only
  place that covers the whole change. Per-package runs can miss cross-package breakage.
- **During focused development**, it's fine to run a single package's scripts from inside
  that package dir (`cd packages/<area> && bun run check`/`test`) for a faster loop —
  but the root run is the gate of record before pushing.

## Pre-push checklist (run from the repo root, in order)

```bash
# 0. clean install if deps changed (the prepare hook builds linked packages)
bun install

# 1. lint + format + type-check + architecture rules, every package
bun run check          # → lerna run check  (biome + tsc --noEmit + webarchitect)

# 2. if check reports fixable issues, apply and re-run check
bun run check:fix      # → lerna run check:fix

# 3. tests, every package
bun run test           # → lerna run test  (vitest run)

# 4. only if the change affects build artifacts / a publishable package
bun run build          # → lerna run build   (dev/link build)
# full artifact build (Storybook, docs, etc.) is a CI concern via each
# package's build:all; run locally only when validating release artifacts
```

A change is push-ready when `bun run check` and `bun run test` both pass from the root.
That mirrors what CI runs, so green locally → green CI (modulo Chromatic visual review
and environment-only tests). If a single test fails for environment reasons unrelated to
the diff, confirm it fails the same way on a clean `origin/main` before discounting it.

> Per-package `check` = `check:biome` (lint+format) → `check:ts` (`tsc --noEmit`) →
> `check:webarchitect` (architecture ruleset). `check:fix` auto-fixes biome then
> re-runs tsc. Every package must define `check`, `check:fix`, and `test`; packages
> with build steps also define `build` and `build:all`.

## Conventions

This is a **convention-heavy monorepo**. Most conventions are documented — in
`old/CONTRIBUTING.md`, `docs/`, the package-folder-structure doc, and the
`pragma-adrs` repo (the `session/I.*` "Pragma Maturity" decisions). **When unsure how
something should be structured, look for the existing convention first** — read a
sibling package/domain and match its layout, naming, error handling, and test
placement — rather than inventing a new pattern. Match the surrounding code's idioms;
a new file should be indistinguishable in style from its neighbours.

## PR mechanics

- Branch from up-to-date `origin/main`; never push to `main` directly — **all changes
  land via PR** on a feature branch.
- Fill in `.github/PULL_REQUEST_TEMPLATE.md` (Done / QA / readiness checklist).
- Add `no visual change` to skip Chromatic when there's no visual diff.
- New package? First-time publish is manual (`npm publish --access public` from the
  package dir); verify with `bun run publish:status` from the root.
