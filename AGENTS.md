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

> **Do not treat per-package green as push-ready.** CI runs `check`/`test` across **all
> ~53 projects** via Nx, so a change can break a *dependent* package you didn't touch (a
> bumped lint/biome version, a shared config, a coverage gate). The root `bun run check`
> is the only thing that catches this. Running it once before the first push is cheaper
> than a CI round-trip.

## Revising before pushing to a PR

CI round-trips are expensive — get the branch right locally first.

1. **Sync to a moved base before pushing.** `git fetch origin main`; if the branch is
   behind, **rebase** (never merge) onto `origin/main`. The lockfile is the usual conflict:
   resolve `bun.lock` by regenerating (`bun install`) — never hand-merge it — and commit
   the regenerated lockfile.
2. **Re-run the full root gate after the rebase**, not just before. A rebase replays your
   commits onto new code: a lint rule, biome version, or coverage threshold that moved on
   `main` can now fail commits that were green on the old base.
3. **Tidy the history.** Reword `WIP`/`fix typo` commits into Conventional-Commit subjects
   and squash noise (`git rebase -i origin/main`) so each commit is atomic and the
   Lerna-generated CHANGELOG reads cleanly. Do this *before* the first push when possible.
4. **Push safely.** First push: plain `git push`. After a rebase/reword (history rewrite):
   `git push --force-with-lease` — it refuses if someone else pushed to the branch
   meanwhile (then rebase on their work first). Never plain `--force`.
5. **Watch the actual CI run** after pushing. Green locally is necessary, not sufficient:
   pull the failing job's log (`gh run view <id> --log-failed`), fix at the source, and
   repeat from step 2. Don't push speculative "maybe this fixes CI" commits.

**Gotchas this repo has actually hit:**
- A biome **version bump** without updating `"$schema"` in a `biome.json` → `biome check`
  fails to deserialize. Keep the schema string in lockstep with the `@biomejs/biome` version.
- Trading a lint violation for coverage (e.g. a `!` non-null assertion to drop an
  uncovered `?? ""` branch) trips `noNonNullAssertion`. Rewrite to satisfy **both**
  (e.g. iterate `Map.entries()` instead of `keys()` + `get()`).
- A **new package** needs a first manual `npm publish --access public` (a human step,
  npm 2FA) before release automation works — merging it does not make it releasable.

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

### Module imports — use relative paths, not `#` subpath aliases

Do **not** use `#`-prefixed `package.json` `"imports"` (Node subpath imports) for
package-internal modules in packages we build and publish with `tsc`. `tsc` never
rewrites module specifiers, so a `#alias` written in source is emitted **verbatim**
into `dist`. The published package then leaks its private `imports` map as part of
its public contract: every consumer's bundler/test-runner has to resolve those `#`
specifiers itself, and mismatched resolve conditions (for example Vite/Vitest
activating the `development` condition, which points at unpublished `src`) break the
build downstream.

Use ordinary relative imports (`../../subcomponent/Spinner/index.js`) with the `.js`
extension (NodeNext). They need zero config in any consumer and survive `tsc` emit
unchanged.

This applies to every **`tsc`-built** package — the discriminator is the build tool,
not the directory. Most libraries under `packages/` are `tsc`-built and are in scope.
Code that a **bundler** compiles may still use `#` aliases, because the bundler inlines
them so nothing is published verbatim: this covers Vite-bundled apps (`apps/*` and
scaffolded boilerplates) **and** Bun-bundled published packages under `packages/` (e.g.
the CLI at `packages/cli/next`). When unsure, check whether the package's build script
runs `tsc` or a bundler.

## PR mechanics

- Branch from up-to-date `origin/main`; never push to `main` directly — **all changes
  land via PR** on a feature branch.
- Fill in `.github/PULL_REQUEST_TEMPLATE.md` (Done / QA / readiness checklist).
- Add `no visual change` to skip Chromatic when there's no visual diff.
- New package? First-time publish is manual (`npm publish --access public` from the
  package dir); verify with `bun run publish:status` from the root.
- **New packages need OIDC trusted-publisher setup — a manual human step, agents cannot
  do it.** Automated releases (`tag.yml`) publish via npm OIDC trusted publishing, but a
  trusted publisher *cannot be configured until a package's first publish* (the npm
  settings page doesn't exist yet). So a new package's first publish is manual, and a
  human must then configure its trusted publisher on npmjs.com — until they do, the
  automated workflow cannot publish future versions. Beware: merging a new package does
  not make it releasable on its own. See
  [`docs/how-to-guides/PUBLISH_A_PACKAGE.md`](docs/how-to-guides/PUBLISH_A_PACKAGE.md).
