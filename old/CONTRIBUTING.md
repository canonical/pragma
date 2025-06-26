## Canonical Design System - Contributing Guide

This guide provides an overview of the contribution process for the Canonical Design System (DS-25) monorepo.

**Note:** This contribution guide is a work in progress. It is currently aimed primarily at engineers. We will be adding
more information for designers and other contributors in the future.

### 1. Getting Started

Before you can start contributing, you'll need to set up your local development environment. Follow these steps:

#### 1.1 Prerequisites

1. **Install Bun:** Install the [bun package manager](https://bun.sh/). This is our preferred package manager for this
   project.
   Make sure you install Bun version 1.2.0 or later, as earlier versions do not generate text-based lockfiles by default.
2. **Install Node.js:** Ensure you have [Node.js](https://nodejs.org/en/download/package-manager) version 20 or later
   installed. This may be used by some packages that are not fully using Bun.

#### 1.2 Installation

1. **Install Dependencies:** Once Node.js and Bun are installed, navigate to the root directory of the monorepo and run
   `bun install`. This will install all necessary dependencies.

### 2. Package Scripts and Monorepo Management

We utilize [Lerna](https://lerna.js.org/) to manage and run package scripts across all packages within the monorepo.
This allows for concurrent task execution and task result caching, improving efficiency.

#### 2.1 Recommended Workflow

While Lerna is useful for running tasks across the entire monorepo, for day-to-day development, we recommend working
within individual package directories.

1. **Navigate to Package Directory:** Change your current directory to the package you are actively working on.
2. **Run Package Scripts:** Execute the appropriate Bun scripts (e.g., `bun run check`, `bun run test`) directly within
   the package directory.

#### 2.2 Lerna for Monorepo-Wide Tasks

In situations where you need to run tasks across all packages, use `lerna run`. \
For instance, `lerna run build` will execute the `build` script defined in each package's `package.json`.

#### 2.3 Standard Package Scripts

To ensure consistency and streamline CI workflows, each package should define the following scripts in its
`package.json`:

* `check`: Lints, formats, and type-checks the package.
* `check:fix`: Lints, formats, type-checks, and automatically fixes issues where possible.
* `test` (if applicable): Runs tests for the package.
* `build` (if applicable): Builds the package for publishing and local development. 

#### 2.4 Full Artifact Builds: build:all

For CI and release workflows, every package that produces build artifacts (e.g., Storybook, docs, etc.) must define a `build:all` script in its `package.json`. This script should build **all** artifacts for the package, not just the minimal build required for linking in local development. This is useful for building artifacts that are not needed for publishing (for example, Storybook builds).

- `build` should remain minimal, for linking and development (e.g., just TypeScript build or equivalent).
- `build:all` must invoke all build steps needed to produce every artifact for the package.

**Example:**
```json
{
  "scripts": {
      "build": "bun run build:package",
      "build:all": "bun run build:package && bun run build:storybook",
      "build:storybook": "storybook build",
      "build:package": "bun run build:package:tsc && bun run build:package:copycss",
  }
}
```

The CI matrix and release workflows will use `build:all` to ensure all artifacts are built. See the PR template for checklist requirements.

### 3. Documentation Standards

#### 3.1 JavaScript Documentation

All JavaScript documentation should adhere to [TSDoc](https://tsdoc.org/) standards. This ensures consistent and easily
parsable documentation.

### 4. Monorepo and Types Management

#### 4.1 Explicit Type Declarations

By default, `@types` dependencies are hoisted to the root `node_modules`. However, this can lead to conflicts and
implicit type consumption. To address this, we explicitly declare `@types` dependencies in both:

* `package.json` under `devDependencies`.
* `tsconfig.json` under `compilerOptions/types`.

This ensures clarity and avoids potential issues.

### 5. Developer Notes

#### 5.1 Cleaning Dependencies and Cache

To clean dependencies and the Lerna task cache, run `bun run special:clean`.

#### 5.2 Cleaning Package Builds

In some cases, you may also need to remove package builds manually using `rm -rf ./**/dist`. This ensures that old build
artifacts are not present after running `bun run build`.

#### 5.3 Adding Dependencies in a Work-in-Progress State

When using `bun add` to install a new dependency, the repository's `prepare` hook triggers a build of linked
dependencies by running `bun run build` at the root level. If the repository is in a work-in-progress (WIP) state, this
build may fail, preventing the dependency from being added to `package.json`.

To avoid this, you have two options:

1. **Manual Addition:** Manually add the dependency to `package.json` and then run `bun i` to install it.
2. **Ignore Scripts:** Use `bun add <dep_name> --ignore-scripts` to add the dependency without running lifecycle
   scripts.

The second option is generally cleaner and more efficient. Therefore, we recommend using `--ignore-scripts` when adding
dependencies to a WIP repository.