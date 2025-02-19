# 1. Canonical Design System & Related Tooling - Architecture

## 1.1 Introduction

This document outlines the architecture of the Canonical Design System and its related tooling.

## 2. Structure

### 2.1 Monorepo Organization

The design system is structured as a [monorepo](https://semaphoreci.com/blog/what-is-monorepo).
It contains many sub-packages for applications, configurations, and other use cases.

The monorepo should not be considered to be a single project that is run as a whole.
Each of its packages are separate modules that can be worked on independently.

- `apps/`: Core applications consuming the design system. These could be documentation sites, boilerplates, etc.
- `configs/`: Recommended configurations for linters, build tools, etc.
- `packages/`: Modules that consume configurations and are consumed by applications.
    - `react/`: Contains packages that are aimed at the React ecosystem. More scope folders could be added in the
      future.
        - [`ds-core`](/packages/react/ds-core/README.md) is especially noteworthy as it publishes our styling
          and React components, and documents them with [Storybook](https://storybook.js.org/).
          This is where much of our work is currently focused.

We use [Lerna](https://lerna.js.org/) to manage and run package scripts across all packages within the monorepo. Lerna
was chosen for its ability to seamlessly manage dependencies between packages, run scripts concurrently, cache task
results, and version packages.

## 3. Build Process

### 3.1 Bun Build vs. Typescript Compiler

[Bun](https://bun.sh/) is being experimentally used as a package manager for this project. Bun includes
a [native JS bundler](https://bun.sh/docs/bundler) that can transpile Typescript.

We are not currently considering using `bun build` for production builds for the following reasons:

* **Globstar inconsistencies**: Bun's [implementation of globstar](https://bun.sh/docs/api/glob) is non-standard. It is
  difficult to build arbitrarily deep filepaths, as Bun expects a globstar for each level of supported nesting. Most
  glob implementations treat a globstar as representing an arbitrary number of non-hidden directories. However, Bun
  currently treats ** as a single level of nesting.
* **Dist depth**: Generating `dist/` output that has the correct folder structure (i.e.,`dist/ui/Button/`) is
  non-trivial. `bun build` generates output with folder structure starting from matching the shallowest source file.
  This is not always desired. For example, if `ui/` is inside `src/`, one must `cd` into `src/` to build `ui/` into
  `dist/`. This adds unneeded complexity to the build process.
* **Type emitting**: `bun build` does not generate types, so it must be accompanied by the usage of some other tool that
  generates type declarations.

Ideally, we could use `bun build` for production builds, as it offers some advantages over the Typescript compiler.

* **Non-TS bundling**: `bun build` copies non-TS assets (such as images, stylesheets, etc) into `dist`. `tsc` must be
  followed up with a manual step that copies non-TS files (such as icons & css) into `dist/`. Currently, we are
  using [copyfiles](https://npmjs.org/package/copyfiles) for this purpose.
* **Speed**: Bun builds slightly faster than the Typescript compiler:

  | Tool       | Command                                                      | Real Time | User Time | Sys Time |
        |------------|--------------------------------------------------------------|-----------|-----------|----------|
  | Bun        | `bun run build:package:bun && bun run build:package:types`   | 0m0.648s  | 0m1.498s  | 0m0.117s |
  | Typescript | `bun run build:package:tsc && bun run build:package:copycss` | 0m0.707s  | 0m1.615s  | 0m0.094s |

Note that the bun build must also call `tsc` to generate type declarations, and the tsc build must call the external
`copyfiles` dependency to copy assets into `dist/`.

For these reasons, we have chosen to use the Typescript compiler for builds, but we are open to revisiting this decision
in the future should Bun improve on the above points.

## 4. Testing

For information on testing, see the dedicated [testing documentation](./TESTING.md).