<!-- Copied from https://github.com/canonical/pragma-core/blob/main/CONTRIBUTING.md; change it there first. -->
# Contributing to pragma

pragma is built in two repositories, [canonical/pragma-core](https://github.com/canonical/pragma-core) and [canonical/pragma-web](https://github.com/canonical/pragma-web). This guide is for everyone who changes either of them, people and agents alike. This file holds what applies to every change; the topic files under [`docs/contributing/`](docs/contributing/) hold each step. Read this file before your first change, then the topic file for the step you are on.

The original of this guide lives in canonical/pragma-core; canonical/pragma-web carries copies. Change the original first, then the copies, in paired pull requests.

## Contents

| When you… | Read |
| --- | --- |
| create a branch and its worktree, install, or run the root gate | [Toolchain](docs/contributing/toolchain.md) |
| add, remove or bump a dependency, change a version, or touch `bun.lock` | [Dependencies](docs/contributing/dependencies.md) |
| commit, sync with `main`, push, or read a failing CI run | [Commits](docs/contributing/commits.md) |
| open, update, review or merge a pull request | [Pull requests](docs/contributing/pull-requests.md) |
| change a workflow, a composite action or `CODEOWNERS`, or add a check | [CI](docs/contributing/ci.md) |
| file, triage, transfer or re-create an issue | [Issues](docs/contributing/issues.md) |
| release, merge while a release may be running, or add a new package | [Releases](docs/contributing/releases.md) |

## A change, step by step

```
- [ ] 1. Pick the repository (below)
- [ ] 2. Create the branch and its worktree, and install (toolchain.md)
- [ ] 3. Read .kb/this-repository.md, and look up the code standards (below)
- [ ] 4. Make the change; for a dependency or a version, dependencies.md
- [ ] 5. Commit (commits.md)
- [ ] 6. Sync with main, run the root gate, push, watch CI (commits.md, toolchain.md)
- [ ] 7. Open the pull request (pull-requests.md)
```

## Which repository owns what

- **pragma-core holds the toolchain.** That means the `pragma` and `summon` command-line tools and the generators, `webarchitect`, the Biome, TypeScript and Renovate configurations, `utils`, `task`, `ke`, `ke-graphql`, `harnesses`, the design tokens and the design-system models.
- **pragma-web holds everything that renders.** That means the React, Svelte and Lit components, the stylesheets, Storybook, the runtime packages, the applications and the documentation site. Anything that renders belongs to pragma-web, even when a generator in pragma-core emits it.
- **pragma-web consumes pragma-core from npm**, pinned to exact versions. A change to a pragma-core package is a pull request in pragma-core. Once it is released, pragma-web bumps the pin ([Dependencies](docs/contributing/dependencies.md)).
- **A change that spans both repositories is two pull requests**, one in each, that name each other. [Pull requests](docs/contributing/pull-requests.md#merge-order-across-the-two-repositories) says which lands first.
- **Some files are shared, and each has one original.** This guide, `AGENTS.md`, `.kb/agents.md` and `CONSTITUTION.md` have their originals in pragma-core, and pragma-web's copies start with a line saying `Copied from <url of the original>; change it there first.` The pull request template is the other way round: its original is pragma-web's, and pragma-core's copy differs only by the Chromatic line. Change the original first, then the copy, in paired pull requests.

## Working with AI: keep your hand on the wheel

- **You are responsible for every line you submit, whoever or whatever wrote it.** Read and understand the whole diff before you open the pull request.
- **Make the smallest change that solves the problem.** Keep the diff minimal and surgical. A bloated pull request with complex code is sent back.
- **Choose what to solve with intention and method.** Not every problem should be fixed. Do not add a guard, a fallback or a workaround for something that should not matter in the first place. Fix the cause, or leave it alone. The pull request body says what you chose not to address, and why.
- **Keep configuration files minimal.** Change one only when the change requires it. Never change one to silence a symptom.

The principles behind this are in the Constitution: [VIII. DRY only for stable patterns](CONSTITUTION.md#viii-dry-only-for-stable-patterns), [IX. No premature optimisation](CONSTITUTION.md#ix-no-premature-optimisation), [XII. Predictable execution](CONSTITUTION.md#xii-predictable-execution) and [XIII. Preference towards minimal tooling](CONSTITUTION.md#xiii-preference-towards-minimal-tooling).

## Toolchain basics

Both repositories are Bun and Lerna monorepos with the same toolchain.

- **Bun is pinned in `.bun-version`.** When `bun --version` differs, run every Bun command through `bunx bun@$(cat .bun-version)`. For `bun.lock`, a version mismatch is a blocker, not a caveat ([Dependencies](docs/contributing/dependencies.md)).
- **Node must be in the `engines` range of the root `package.json`**, because Lerna requires it. `bun install` warns when the local Node is outside it.
- **A fresh worktree has no `node_modules`.** Run `bun install` in it before the first `check` or `test`.
- **npm appears only for the first publish of a new package** ([Releases](docs/contributing/releases.md#new-packages)). Never run `npm install`.
- **A branch is push-ready when `bun run check` and `bun run test` pass from the repository root** ([Toolchain](docs/contributing/toolchain.md#run-the-root-gate)).

## Always

- **Every change lands through a pull request** from its own branch. Nobody pushes to `main` directly.
- **Read `.kb/this-repository.md` before changing anything**, then the topic files it names for the area you are about to change. It also names the steps that are specific to this repository.
- **Look up the code standards for the code you are about to write, and follow them.** They live in [`@canonical/code-standards`](https://github.com/canonical/pragma-core/tree/main/packages/semantics/code-standards), and the pragma MCP server serves them to agents. The server comes with the `pragma` command-line tool: install it with `bun add --global @canonical/pragma-cli`, then register the server with your agent with `pragma setup mcp`. Filter `standard_list` by the category you are about to write (such as `react`, `css`, `packaging` or `testing`), then read each match with `standard_lookup` (`detail: "detailed"`). A rule that a standard holds is not restated in this guide: the guide names the standard, for example `cs:git.commit.message`.
- **A branch that someone else builds on takes normal commits only**: no amend, no rebase, no force-push ([Commits](docs/contributing/commits.md#sync-with-main)).
- **Never start a release, push a tag or publish a package without a maintainer's explicit go** ([Releases](docs/contributing/releases.md)).
