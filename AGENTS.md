<!-- Copied from https://github.com/canonical/pragma-core/blob/main/AGENTS.md; change it there first. -->
# Preface

This file is the entry point for agents and humans working in either pragma repository, `canonical/pragma-core` or `canonical/pragma-web`. It states the rules that hold for every change and names the skill for each job. Read it before changing anything in this repository.

The original of this file lives in canonical/pragma-core; canonical/pragma-web carries a copy that links to it. Change the original first, then the copy, in paired pull requests.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

pragma is built in two repositories. `canonical/pragma-core` holds the toolchain: the command-line tools, the generators, the configurations, the knowledge engine (`ke` and `ke-graphql`), the design tokens and the design-system models. `canonical/pragma-web` holds everything that renders, and consumes the pragma-core packages from npm. Both are Bun and Lerna monorepos with the same toolchain and the same rules for commits, issues, pull requests and CI. What is specific to this repository is in `.kb/this-repository.md`.

# Important

- Every change lands through a pull request from a `type/description` branch; nobody pushes to `main` directly.
- Before writing code, look up the code standards that apply and follow them. Find them with the pragma MCP tool `standard_list` and read each with `standard_lookup` (`detail: "detailed"`); the `start-change` skill says how to get the tools.
- When unsure how something should be structured, look for the existing convention first: read a sibling package or domain and match its layout, naming, error handling and test placement rather than inventing a new pattern. A new file should be indistinguishable in style from its neighbours.
- Comments explain the code, not where it came from. Never leave provenance markers that trace a file back to the spec, DSL, graph or plan it was generated from, such as `{/* DSL edges[0]: content (cardinality: 1) */}`.
- Never start a release, push a tag or publish a package without a maintainer's explicit go.

## Skills

Load the skill for the job you are doing. The skills come from the `@canonical/skills-contribute` package; `.kb/this-repository.md` says how to load them here.

- `start-change` - Start any change here: the repository, the branch and its worktree, the install. Load it first.
- `change-dependencies` - Change a dependency, a version or `bun.lock`.
- `commit-changes` - Write commits.
- `push-branch` - Get a branch push-ready and push it.
- `open-pull-request` - Open, update and land a pull request.
- `file-issue` - File, triage and move an issue.
- `change-ci` - Change a workflow or add a check.

# Documents

- `.kb/agents.md` - Rules for reading and writing this knowledge base.
- `.kb/this-repository.md` - In this repository: what is specific to it, how to load the skills, and the topic files that cover it.
