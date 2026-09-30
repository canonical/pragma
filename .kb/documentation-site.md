# Preface

The dependency direction between the documentation site and the packages it documents. Read this before adding a dependency to a runtime or component package, or before adding a check to one.

Read the top-level `.kb/agents.md` file before continuing below.

# Important

- Nothing enforces this direction, so it is a review obligation: a new `@canonical/prism-*` entry in a manifest under `packages/runtime/` or in a component package is a change to challenge, whatever it is for.

# Architecture

`packages/prism/*` and the documentation-site application (`apps/react/pragma-docs`) are the site layer. They may depend on anything below them: `packages/runtime/*`, the component packages, and the toolchain packages from npm (`@canonical/ke`, `@canonical/ke-graphql`).

Nothing in those depended-upon packages may depend on `packages/prism/*`, not even as a devDependency. The usual pressure to reverse the arrow is a conformance check: the site authors a contract, and it is tempting to have the package that must satisfy the contract assert that it does. That is the package marking its own homework, and it costs the package a dependency on the site it exists to be independent of. Site-side packages hold those gates instead, reading whatever they need to read.
