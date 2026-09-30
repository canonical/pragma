# Preface

How a package imports its own modules: relative paths, and no `#` subpath aliases in packages built with `tsc`. Read this before adding an import or an `"imports"` map to a package.

This file is identical in canonical/pragma-core and canonical/pragma-web; change both in paired pull requests.

Read the top-level `.kb/agents.md` file before continuing below.

# Important

- **Do not use `#`-prefixed `package.json` `"imports"` (Node subpath imports) for package-internal modules in packages built and published with `tsc`.** `tsc` never rewrites module specifiers, so a `#alias` written in source is emitted verbatim into `dist`. The published package then leaks its private `imports` map as part of its public contract: every consumer's bundler or test runner has to resolve those `#` specifiers itself, and mismatched resolve conditions break the build downstream, for example when Vite or Vitest activates the `development` condition, which points at unpublished `src`.
- **Use ordinary relative imports with the `.js` extension (NodeNext)**, such as `../../subcomponent/Spinner/index.js`. They need no configuration in any consumer and survive `tsc` emit unchanged.
- **The build tool decides, not the directory.** The rule applies to every `tsc`-built package, and most libraries under `packages/` are `tsc`-built. Code that a bundler compiles may still use `#` aliases, because the bundler inlines them and nothing is published verbatim: Vite-bundled applications (`apps/*` and scaffolded boilerplates) and Bun-bundled published packages, such as the `pragma` command-line tool in `canonical/pragma-core`. When unsure, check whether the package's build script runs `tsc` or a bundler.
