<!-- Copied from https://github.com/canonical/pragma-core/blob/main/AGENTS.md; change it there first. -->
# Preface

This file is the entry point for agents and humans working in either pragma repository, `canonical/pragma-core` or `canonical/pragma-web`. It states the rules that hold for every change and points at the contributing guide. Read it before changing anything in this repository.

The original of this file lives in canonical/pragma-core; canonical/pragma-web carries a copy that links to it. Change the original first, then the copy, in paired pull requests.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

pragma is built in two repositories. `canonical/pragma-core` holds the toolchain: the command-line tools, the generators, the configurations, the knowledge engine (`ke` and `ke-graphql`), the design tokens and the design-system models. `canonical/pragma-web` holds everything that renders, and consumes the pragma-core packages from npm. Both are Bun and Lerna monorepos with the same toolchain and the same rules for commits, issues, pull requests and CI, written in `CONTRIBUTING.md`. What is specific to this repository is in `.kb/this-repository.md`.

# Important

- Read `CONTRIBUTING.md` before any change, then the file under `docs/contributing/` for the step you are on: toolchain, dependencies, commits, pull requests, CI, issues or releases.
- Every change lands through a pull request from a `type/description` branch; nobody pushes to `main` directly.
- Before writing code, look up the code standards that apply and follow them. Find them with the pragma MCP tool `standard_list` and read each with `standard_lookup` (`detail: "detailed"`); `CONTRIBUTING.md` says how to get the tools.
- When unsure how something should be structured, look for the existing convention first: read a sibling package or domain and match its layout, naming, error handling and test placement rather than inventing a new pattern. A new file should be indistinguishable in style from its neighbours.
- Comments explain the code, not where it came from. Never leave provenance markers that trace a file back to the spec, DSL, graph or plan it was generated from, such as `{/* DSL edges[0]: content (cardinality: 1) */}`.
- Never start a release, push a tag or publish a package without a maintainer's explicit go.

# Documents

- `CONTRIBUTING.md` - How to contribute to either repository: what applies to every change, and a table of contents to the topic files under `docs/contributing/`.
- `.kb/agents.md` - Rules for reading and writing this knowledge base.
- `.kb/this-repository.md` - In this repository: what is specific to it, and the topic files that cover it.
