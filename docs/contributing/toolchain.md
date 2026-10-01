<!-- Copied from https://github.com/canonical/pragma-core/blob/main/docs/contributing/toolchain.md; change it there first. -->
# Toolchain: branch, install and the root gate

How a change gets onto a clean branch, installed, and checked before every push. The pinned Bun and Node rules are in [CONTRIBUTING.md](../../CONTRIBUTING.md#toolchain-basics).

## Contents

- Create the branch and its worktree
- Install
- Run the root gate

## Create the branch and its worktree

Name the branch by the branch-name standard (`cs:git.branch.name`), using only the commit types this repository allows ([commits.md](commits.md)).

Branch from an up-to-date `origin/main`, in a worktree under `.claude/worktrees/`. Name the worktree folder after the branch, with the `/` replaced by `-`:

```bash
git fetch origin
# branch feat/minor-cli-improvements  →  worktree folder feat-minor-cli-improvements
git worktree add -b feat/minor-cli-improvements \
  .claude/worktrees/feat-minor-cli-improvements origin/main
```

## Install

Run `bun install` in the new worktree, with the pinned Bun, before the first `check` or `test`. Install again whenever dependencies change; [dependencies.md](dependencies.md) says how the lockfile is regenerated.

## Run the root gate

Every edit, even a one-line fix, is installed and checked locally before it is pushed:

```bash
bun install          # when dependencies changed, or in a fresh worktree
bun run check        # lint, format, type-check and architecture rules, every package
bun run check:fix    # when check reports fixable issues; then run check again
bun run test         # tests, every package
bun run build        # only when the change affects build artifacts or a publishable package
```

- **A branch is push-ready when `bun run check` and `bun run test` pass from the repository root**, after syncing with `main` ([commits.md](commits.md)), not only before it. CI runs every affected package, so a change can break a package you did not touch through a shared configuration, a Biome version or a coverage gate. Running one package's scripts from its own folder is a fast loop, not the gate.
- **Satisfy lint and coverage together.** Do not trade one for the other, for example with a `!` non-null assertion that drops an uncovered `?? ""` branch. Rewrite the code so both pass.
- **Blame the environment only after the same failure reproduces on a clean `origin/main`.**
- **On a loaded machine, local tests can time out.** Re-run with a longer timeout or with `--concurrency 1`, and say which you did. CI is the verdict.
- **`.kb/this-repository.md` names any check the root gate does not cover here.**
