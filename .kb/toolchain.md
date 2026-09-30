# Preface

The tools a change in this repository is built, checked and installed with: Bun, Node, npm and the lockfile. Read this before installing dependencies, changing a manifest, or regenerating `bun.lock`.

This file is identical in canonical/pragma-core and canonical/pragma-web; change both in paired pull requests.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

Bun is the package manager and script runner (`bun install`, `bun run <script>`). Node runs the tools that need fuller Node compatibility, Lerna among them. Lerna fans root scripts out to every package, and Nx orders and caches them.

# Important

- **Bun is pinned once, in `.bun-version`.** Every `setup-bun` step in CI reads it through `bun-version-file`, so a bump moves every job at once. Locally, compare `bun --version` with `.bun-version`; when they differ, run the pinned Bun through `bunx`, for example `bunx bun@$(cat .bun-version) install`.
- **Node.js `^22.13.0 || ^24.0.0 || ^26.0.0` must also be present.** This is the range Lerna requires, and therefore the range the root gate runs under: Node lines 22, 24 and 26. Node 20, 23 and 25 are excluded, and 23 also has a known compatibility issue. The root `package.json` declares the range in `engines`, so `bun install` warns when the local Node is outside it.
- **npm appears only for the first publish of a new package** (`npm publish --access public` from inside the package directory), never for day-to-day development. Do not use `npm install`.
- **Regenerate `bun.lock` only with the pinned Bun.** Another Bun version rewrites the lockfile differently from the one CI compares against, and the difference is not visible by eye. A version mismatch is a blocker, not a caveat.
- **The lockfile settles in two installs.** When a change edits workspace package versions and sibling ranges together, Bun records the new versions on the first `bun install` and the new ranges only on the second. Run `bun install` twice and commit the result; a third install must leave `bun.lock` unchanged. The release workflow installs twice after its version bump for the same reason.
- **Never hand-merge `bun.lock`.** Resolve a lockfile conflict by regenerating it with `bun install` and committing the regenerated file.
- **Keep `"$schema"` in every `biome.json` in lockstep with the `@biomejs/biome` version.** A Biome bump that leaves the schema string behind makes `biome check` fail to deserialize its configuration.
