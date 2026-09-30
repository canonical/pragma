# Preface

How to name a branch and where to check it out for local development. Read this before starting a new line of work.

This file is identical in canonical/pragma-core and canonical/pragma-web; change both in paired pull requests.

Read the top-level `.kb/agents.md` file before continuing below.

# Important

- **Branch names follow `type/semantic-description`.** The `type` matches the conventional-commit types (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, …) and the description is kebab-case and meaningful, for example `feat/minor-cli-improvements` or `fix/storybook-subpath-imports`. Every branch name carries a `/`.
- **Branch from an up-to-date `origin/main`.** Never push to `main` directly; every change lands through a pull request from a feature branch.
- **Work in a git worktree, not by switching the main checkout.** Create one worktree per branch under `.claude/worktrees/`, and name its directory after the branch with the `/` replaced by `-`, because a `/` cannot be a single path segment:

  ```bash
  # branch feat/minor-cli-improvements  →  worktree dir feat-minor-cli-improvements
  git worktree add -b feat/minor-cli-improvements \
    .claude/worktrees/feat-minor-cli-improvements origin/main
  ```

  Each line of work stays isolated, several can proceed in parallel, and the main checkout stays untouched.
- **A fresh worktree has no `node_modules`.** Run `bun install` inside it before the first `check` or `test`.
