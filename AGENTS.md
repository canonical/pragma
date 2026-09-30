# Preface

This file is the entry point for agents and humans working in either pragma repository, `canonical/pragma-core` or `canonical/pragma-web`. It states the rules every change follows and names the topic files that hold the detail. Read it before changing anything in this repository.

This file is identical in canonical/pragma-core and canonical/pragma-web; change both in paired pull requests.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

pragma is built in two repositories. `canonical/pragma-core` holds the toolchain: the `pragma` and `summon` command-line tools and the generators, `webarchitect`, the Biome, TypeScript and Renovate configurations, `utils`, `task`, `ke`, `ke-graphql`, `harnesses`, the design tokens and the design-system models. `canonical/pragma-web` holds everything that renders: the React, Svelte and Lit components, the stylesheets, Storybook, the runtime packages, the applications and the documentation site. Anything that renders belongs to pragma-web, even when a generator in pragma-core emits it.

pragma-web consumes the pragma-core packages from npm, pinned to exact versions. A change to one of them is a pull request in pragma-core; once it is released, pragma-web bumps the pin in every manifest that names it. A change that spans both repositories is two pull requests, and the pragma-core one lands first.

Both repositories are Bun and Lerna monorepos with the same toolchain, the same commit, issue and pull-request rules, and the same CI shape. The topic files listed below are identical in both repositories. What is specific to this repository is in `.kb/this-repository.md`.

# Important

- Every change lands through a pull request from a `type/description` branch; nobody pushes to `main` directly.
- A change is push-ready only when `bun run check` and `bun run test` pass from the repository root.
- Pull request bodies and commit subjects stand on their own and cite no internal planning document.
- CI workflows are global: never add a workflow job or step for one package.
- Regenerate `bun.lock` only with the Bun version pinned in `.bun-version`.
- When unsure how something should be structured, look for the existing convention first: read a sibling package or domain and match its layout, naming, error handling and test placement rather than inventing a new pattern. A new file should be indistinguishable in style from its neighbours.
- Comments explain the code, not where it came from. Never leave provenance markers that trace a file back to the spec, DSL, graph or plan it was generated from, such as `{/* DSL edges[0]: content (cardinality: 1) */}`.

# Documents

- `.kb/agents.md` - Rules for reading and writing this knowledge base.
- `.kb/toolchain.md` - The pinned Bun, the supported Node lines, when npm is used, and regenerating the lockfile.
- `.kb/branches-and-worktrees.md` - Branch names and one git worktree per branch.
- `.kb/commits.md` - Semantic, atomic commits and the generated changelog.
- `.kb/pre-push.md` - The root gate, the pre-push checklist, and revising a branch before pushing.
- `.kb/pull-requests.md` - The template, semantic titles, labels, and bodies that stand alone.
- `.kb/issues.md` - Issue titles, type labels, and which repository an issue belongs in.
- `.kb/ci.md` - Why workflows are global, and why CI never codes against remote services.
- `.kb/module-imports.md` - Relative imports, and no `#` aliases in `tsc`-built packages.
- `.kb/this-repository.md` - In this repository: what is specific to it, and the topic files that cover it.
