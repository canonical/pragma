# Preface

How the packages here depend on the `canonical/pragma-core` packages, and how those pins move after a pragma-core release. Read this before adding a dependency on a pragma-core package, or before moving its pins.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

The toolchain, the design tokens and the shared configurations come from `canonical/pragma-core` through npm. Renovate groups each pragma-core release into one pull request, which does not merge on its own.

# Important

- **A pragma-core package is pinned to an exact version** in `dependencies` and `devDependencies`. A **peer** dependency on one is a range instead, such as `>=0.10.0 <1.0.0`, so a consumer's own pin satisfies it.
- **A package whose published CSS imports `@canonical/design-tokens` lists it in `dependencies`**, so it is installed wherever that CSS is.
- **Re-pin each package to its own published version**, looked up per package. Lerna publishes only the packages that changed, so the packages of one pragma-core release can carry different numbers.
- **Move the pins only once every package's npm `latest` is exactly its target version.** Rewrite only `dependencies` and `devDependencies`, never the peer ranges.
- **Bun accepts an unsatisfiable peer range without complaint, while npm consumers fail with `ERESOLVE`.** Check a peer range against the versions actually published, not only against a green `bun install`.
