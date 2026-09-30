# Preface

What to run before pushing, where to run it, and how to revise a branch so that CI passes on the first run. Read this before every push.

This file is identical in canonical/pragma-core and canonical/pragma-web; change both in paired pull requests.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

Root scripts fan out across every affected package through Lerna, with Nx caching, so the repository root is the only place that covers a whole change. Every package defines `check`, `check:fix` and `test`; packages with build steps also define `build` and `build:all`. A package's `check` runs at least `check:biome` (lint and format), then `check:ts` (`tsc --noEmit`), then `check:webarchitect` (the architecture ruleset). `check:fix` applies Biome's fixes and re-runs `tsc`.

# Important

- **Before pushing, run the full gate from the repository root**, in this order:

  ```bash
  # 0. clean install if dependencies changed (the prepare hook builds linked packages)
  bun install

  # 1. lint, format, type-check and architecture rules, every package
  bun run check          # → lerna run check  (biome + tsc --noEmit + webarchitect)

  # 2. if check reports fixable issues, apply them and re-run check
  bun run check:fix      # → lerna run check:fix

  # 3. tests, every package
  bun run test           # → lerna run test  (vitest run)

  # 4. only if the change affects build artifacts or a publishable package
  bun run build          # → lerna run build  (development and link build)
  # the full artifact build (Storybook, docs, …) is a CI concern through each
  # package's build:all; run it locally only to validate release artifacts
  ```

- **A change is push-ready when `bun run check` and `bun run test` both pass from the root.** That mirrors what CI runs, so green locally means green CI, apart from environment-only tests and any check `.kb/this-repository.md` names. If a single test fails for environment reasons unrelated to the diff, confirm that it fails the same way on a clean `origin/main` before discounting it.
- **Per-package green is not push-ready.** CI runs `check` and `test` across every package through Nx, so a change can break a dependent package you did not touch, through a bumped lint or Biome version, a shared configuration or a coverage gate. Running a single package's scripts from inside its directory (`cd packages/<area> && bun run check`) is fine for a fast loop during development, but the root run is the gate of record.
- **Satisfy lint and coverage together.** Trading a lint violation for coverage, such as a `!` non-null assertion that drops an uncovered `?? ""` branch, trips `noNonNullAssertion`. Rewrite the code so that both pass, for example by iterating `Map.entries()` instead of `keys()` and `get()`.
- **Revise the branch before pushing to a pull request.** A CI round-trip is expensive, so get the branch right locally first:
  1. Sync to a moved base. Run `git fetch origin main`; if the branch is behind, rebase it onto `origin/main` (never merge). Resolve a `bun.lock` conflict by regenerating it (`.kb/toolchain.md`).
  2. Re-run the full root gate after the rebase, not only before it. A rebase replays the commits onto new code, and a lint rule, Biome version or coverage threshold that moved on `main` can fail commits that were green on the old base.
  3. Tidy the history. Reword `WIP` and `fix typo` commits into conventional subjects and squash noise with `git rebase -i origin/main`, before the first push when possible.
  4. Push safely. The first push is a plain `git push`. After a rebase or reword, push with `git push --force-with-lease`, which refuses when someone else pushed to the branch meanwhile; rebase onto their work first. Never use plain `--force`.
  5. Watch the CI run after pushing. Green locally is necessary, not sufficient: read the failing job's log with `gh run view <id> --log-failed`, fix the cause at its source, and repeat from step 2. Do not push speculative "maybe this fixes CI" commits.
