# Adding a package

This guide explains how to add a new package to the pragma monorepo. It covers when to create a new package rather than extend an existing one, where packages belong in the directory structure, and the configuration files that every package requires.

## Quick path: `pragma create package`

The fastest way to add a package is through the generator. It produces all required files---`package.json`, `tsconfig.json`, `tsconfig.build.json`, `biome.json`, `vitest.config.ts`, barrel export, and README---configured for the monorepo with correct dependencies, scripts, and webarchitect ruleset.

```bash
pragma create package
```

The generator prompts for the package name, location, and type (library or tool). The location is a domain directory under `packages/` — see [Package locations](#package-locations) for how to choose one. To skip prompts:

```bash
pragma create package --name my-utils --path packages/runtime/my-utils --type library --yes
```

After generation, install dependencies and verify:

```bash
bun install
bun run --filter @canonical/my-utils check
bun run --filter @canonical/my-utils test
```

The generated package is ordinary code with no special relationship to the generator. Every file can be modified. The rest of this guide explains what the generator produces and why, so that modifications are informed rather than guesswork.

## When to create a new package

Not every piece of functionality deserves its own package. The overhead of separate configuration, versioning, and maintenance means that new packages should earn their existence. Consider creating a new package when the functionality has consumers beyond a single application, when it represents a coherent unit that could be versioned independently, or when it belongs to a different architectural layer than existing packages.

Extend an existing package instead when the functionality is specific to one consumer, when it depends heavily on the internals of an existing package, or when splitting it would create circular dependencies. The `@canonical/utils` package, for example, grows when new utilities prove useful across multiple packages. Adding a function to utils is simpler than creating a new package for that function alone.

## Package locations

Packages live in subdirectories of `packages/` based on their domain. The location determines how consumers import the package and influences CI path filtering.

A domain is a directory that names the **concern** a package serves: `packages/react/` for the React bindings, `packages/runtime/` for the framework-agnostic engines, `packages/contracts/` for the shared type contracts, and so on. [Domains](../explanations/DOMAINS.md) lists every one of them and says what belongs in it and what does not; read it before choosing a location. The paragraphs below describe the domains you are most likely to reach for.

Framework-agnostic runtime packages live in `packages/runtime/`. These are the engines the framework bindings are built on — `i18n-core`, `router-core` and `ds-utils` are shared by the React, Svelte and Lit implementations, while `task`, `harnesses` and `ke` are runtimes for Node and the CLI. If a library holds logic rather than markup, and more than one framework package needs it, it belongs here rather than at the top level.

React component packages live in `packages/react/`. The subdirectory structure mirrors the component tier hierarchy: `ds-global` for universal components, `ds-app` for application components, and specialized packages like `ds-app-launchpad` for domain-specific components.

Style packages live in `packages/styles/`. The structure reflects the CSS layering: `main` aggregates the layers in order, `typography` supplies the baseline-grid engine and type scale, and `debug` holds the opt-in development aids.

Storybook packages live in `packages/storybook/`. The addons extend Storybook with project-specific functionality like the baseline grid overlay and MSW integration; `config` is the shared configuration factory every Storybook in the repository builds on.

A shipped binary lives in `packages/cli/`, beside `pragma` and `summon`. Two general-purpose tools, `utils` and `webarchitect`, sit directly in `packages/` rather than under a domain: they are the exception, not a place to add to.

### A new domain directory needs a new workspace glob

The root `package.json` `workspaces` array lists each domain explicitly, and every entry matches exactly **one** level:

```json
{
  "workspaces": [
    "configs/*",
    "packages/*",
    "packages/react/*",
    "packages/runtime/*",
    "packages/storybook/*",
    "packages/summon/*",
    "packages/cli/*",
    "packages/styles/*",
    "packages/svelte/*",
    "packages/lit/*",
    "packages/contracts/*",
    "packages/assets/*",
    "packages/semantics/*",
    "apps/*",
    "apps/react/*",
    "apps/lit/*"
  ]
}
```

A package added to an **existing** domain — `packages/react/my-thing` — is matched by `packages/react/*` and needs nothing further. A package added under a **new** domain — `packages/my-domain/my-thing` — is matched by nothing, because `packages/*` stops one level short. **Add `"packages/my-domain/*"` to the array in the same commit that creates the directory.**

This is the step that is easiest to miss and hardest to diagnose, because nothing in the repository points at it:

- `bun install` does not warn. A directory outside every glob is not a workspace member, so Bun treats `@canonical/my-thing` as an ordinary registry dependency and fetches it from npm. For a package that is private or not yet published, install fails with a **404 on a package that is sitting in the working tree** — an error that describes the symptom and not the cause.
- `scripts/check-workspace-ranges.ts` cannot catch it. The guard enumerates packages *from* the root globs, which is what makes it maintenance-free — but it also means a package no glob matches is invisible to the guard. Its count simply does not rise, and a count that does not rise looks exactly like a count that is correct.
- `nx` **will** see the package, because it discovers projects from the filesystem. A disagreement between `nx show projects` and the workspace guard is the clearest signal that a glob is missing.

Verify with the two commands together — they must agree:

```bash
bunx nx show projects | jq length      # discovered from the filesystem
bun run check:ranges                   # enumerated from the root globs
```

## Webarchitect rulesets

Every package must declare a webarchitect ruleset. Webarchitect validates that packages conform to architectural standards, including license requirements, export structure, and configuration file presence. The three rulesets serve different package categories.

The `library` ruleset applies to packages consumed by other packages or applications. Libraries use LGPL-3.0 licensing, which permits consumption without requiring consumers to open-source their applications. Libraries must have a build step that produces distributable JavaScript and type definitions. Most packages in the monorepo are libraries.

The `tool` ruleset applies to compiled CLI tools and applications. Tools use GPL-3.0 licensing and produce executable artifacts. The `tool` ruleset expects the same build infrastructure as `library` but with the stricter license.

The `tool-ts` ruleset applies to TypeScript-only tools that run directly with Bun without a build step. These packages point `module` and `types` directly at TypeScript source files rather than compiled output. The `webarchitect` package itself uses this ruleset because it runs via `bun` and does not need compilation to JavaScript.

## Creating a library package

Library packages are the most common type. This section walks through creating a new utility library as an example.

### Step 1: Create the Directory

Create the package directory under the domain that names the concern it serves; [Domains](../explanations/DOMAINS.md) says which one that is. The example below is a framework-agnostic utility library, which puts it in `packages/runtime/`:

```bash
mkdir -p packages/runtime/my-utils/src
```

### Step 2: Create package.json

The package.json file defines the package identity, exports, scripts, and dependencies. Library packages follow a consistent structure.

```json
{
  "name": "@canonical/my-utils",
  "description": "Utility functions for specific domain",
  "version": "0.11.0",
  "type": "module",
  "module": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "files": ["dist"],
  "author": {
    "email": "webteam@canonical.com",
    "name": "Canonical Webteam"
  },
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "types": "./dist/types/index.d.ts",
      "default": "./dist/esm/index.js"
    }
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/canonical/pragma"
  },
  "license": "LGPL-3.0",
  "bugs": {
    "url": "https://github.com/canonical/pragma/issues"
  },
  "homepage": "https://github.com/canonical/pragma#readme",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "build:all": "tsc -p tsconfig.build.json",
    "check": "bun run check:biome && bun run check:webarchitect",
    "check:webarchitect": "webarchitect library",
    "check:fix": "bun run check:biome:fix && bun run check:ts",
    "check:biome": "biome check",
    "check:biome:fix": "biome check --write",
    "check:ts": "tsc --noEmit",
    "test": "bun run test:vitest",
    "test:vitest": "vitest run",
    "test:vitest:watch": "vitest"
  },
  "devDependencies": {
    "@biomejs/biome": "2.4.5",
    "@canonical/biome-config": "^0.11.0",
    "@canonical/typescript-config": "^0.11.0",
    "@canonical/webarchitect": "^0.11.0",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^4.0.17"
  }
}
```

The `exports` field defines the public API. The structure shown here exposes a single entry point at the package root. Packages with multiple entry points add additional keys like `"./utils"` or `"./types"`.

The `files` array controls what gets published to npm. Including only `dist` ensures that source files, tests, and configuration stay out of the published package.

The version should match the current monorepo version. Lerna's fixed versioning keeps all packages at the same version number.

### Step 3: Create TypeScript Configuration

Two TypeScript configuration files serve different purposes. The base `tsconfig.json` configures the editor and type checking. The `tsconfig.build.json` configures compilation for distribution.

Create `tsconfig.json`:

```json
{
  "extends": "@canonical/typescript-config",
  "compilerOptions": {
    "baseUrl": "src",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "vite.config.ts", "vitest.config.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

Create `tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist/esm",
    "declaration": true,
    "declarationDir": "dist/types",
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.tests.ts", "vite.config.ts", "vitest.config.ts"]
}
```

The base config extends the shared `@canonical/typescript-config` package, which defines strict type checking rules and module resolution settings. The build config adds output paths and excludes test files from compilation.

For React packages, extend `@canonical/typescript-config-react` instead of `@canonical/typescript-config`. The React config includes JSX settings and React-specific type definitions.

### Step 4: Create Biome Configuration

Biome handles linting and formatting. Create `biome.json`:

```json
{
  "extends": ["@canonical/biome-config"],
  "files": {
    "includes": ["**/src/**", "**/*.json"]
  }
}
```

The shared Biome configuration defines formatting rules and lint checks. Extending it ensures consistency across all packages. The `includes` pattern focuses checks on source files and JSON configuration.

### Step 5: Create Test Configuration

Vitest provides the test runner. Create `vitest.config.ts`:

```typescript
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          test: {
            name: "client",
            globals: true,
            include: ["src/**/*.tests.ts"],
          },
        },
      ],
    },
  }),
);
```

Create `vite.config.ts` for the base Vite configuration:

```typescript
import { defineConfig } from "vite";

export default defineConfig({});
```

The Vitest configuration merges with Vite configuration because Vitest uses Vite for module resolution and transformation. The `globals: true` setting makes test functions like `describe`, `it`, and `expect` available without imports.

### Step 6: Create Initial Source Files

Create `src/index.ts` as the package entry point:

```typescript
export { myFunction } from "./myFunction.js";
export type { MyFunctionOptions } from "./types.js";
```

The index file re-exports the public API. Use named exports rather than default exports to enable precise tree-shaking. Include the `.js` extension in imports because the compiled output uses JavaScript file extensions.

Create a types file and an implementation file to complete the initial structure. The package is now ready for development.

### Step 7: Install Dependencies

**First confirm a root workspace glob matches the new directory.** If the package sits under a domain that is not already in the root `package.json` `workspaces` array, add it now — see [A new domain directory needs a new workspace glob](#a-new-domain-directory-needs-a-new-workspace-glob). Everything below assumes membership; without it `bun install` reaches for the registry instead of the working tree.

Run `bun install` from the monorepo root to link the new package into the workspace:

```bash
cd /path/to/pragma
bun install
```

Bun resolves workspace dependencies and creates symlinks for local packages. After installation, other packages can depend on the new package using its scoped name.

Confirm the link is real rather than a registry copy — this is the check that distinguishes a workspace member from a package Bun downloaded:

```bash
readlink node_modules/@canonical/my-utils     # → ../../packages/runtime/my-utils
```

A symlink into the working tree means the package is a workspace member. A real directory means it was resolved from npm, which for a package you have not published yet means the build is using someone else's code — or, more often, that install failed with a 404.

### Step 8: Validate Configuration

Run webarchitect to verify the package configuration:

```bash
cd packages/runtime/my-utils
bun run check:webarchitect
```

Webarchitect validates the package.json structure, license declaration, export configuration, and required scripts. Fix any validation errors before committing.

## Creating a tool package

Tool packages differ from libraries in three ways: they use GPL-3.0 licensing, they may not need a build step if they run directly with Bun, and they typically provide a CLI entry point.

For a TypeScript-only tool that runs with Bun (the `tool-ts` ruleset), the package.json differs from a library:

```json
{
  "name": "@canonical/my-tool",
  "description": "A development tool for specific purpose",
  "version": "0.11.0",
  "type": "module",
  "module": "src/index.ts",
  "types": "src/index.ts",
  "bin": {
    "my-tool": "src/cli.ts"
  },
  "files": ["src"],
  "license": "GPL-3.0",
  "scripts": {
    "build": "echo 'No build needed - runs directly from TypeScript'",
    "build:all": "bun run build",
    "check": "bun run check:biome && bun run check:ts && bun run check:webarchitect",
    "check:webarchitect": "webarchitect tool-ts"
  }
}
```

The key differences: `module` and `types` point to TypeScript source files, `files` includes `src` instead of `dist`, and `check:webarchitect` uses the `tool-ts` ruleset. The build script does nothing because Bun executes TypeScript directly.

> **Ship-raw-TS only works when the consumer runs Bun.** This pattern is fine for packages
> consumed inside the monorepo or bundled into a compiled binary. A package that publishes a
> **node-runnable `bin`** (or is `await import()`-ed at runtime by one) must instead compile to
> `dist/esm` with `tsc -p tsconfig.build.json`, point `main`/`module`/`exports`/`bin` at the
> built JS, set `files: ["dist"]`, and use `#!/usr/bin/env node`. Node cannot execute `.ts`,
> and `__dirname`/`import pkg from "./package.json"` behave differently under Node ESM. See the
> `@canonical/summon` / `@canonical/summon-application` packages for a worked example, including
> copying non-`.ts` template assets into `dist` (they are not compiled by `tsc`).

The `bin` field declares the CLI entry point. After installation, users can run the tool by name.

## Creating a React component package

React component packages add Storybook configuration and CSS handling. The package.json includes additional scripts and dependencies:

```json
{
  "scripts": {
    "build": "bun run build:package",
    "build:all": "bun run build:package && bun run build:storybook",
    "build:storybook": "storybook build",
    "build:package": "bun run build:package:tsc && bun run build:package:copycss",
    "build:package:copycss": "copyfiles -u 1 'src/ui/{,**/}*.css' dist/esm",
    "build:package:tsc": "tsc -p tsconfig.build.json",
    "storybook": "storybook dev -p 6006 --no-open --host 0.0.0.0"
  },
  "dependencies": {
    "@canonical/styles": "^0.11.0",
    "react": "^19.2.3",
    "react-dom": "^19.2.3"
  },
  "devDependencies": {
    "@canonical/typescript-config-react": "^0.11.0",
    "storybook": "^10.1.11",
    "copyfiles": "^2.4.1"
  }
}
```

The `build:package:copycss` script copies CSS files to the distribution directory because TypeScript compilation does not handle CSS. The pattern `src/ui/{,**/}*.css` matches CSS files in the components directory and its subdirectories.

React component packages need Storybook configuration. See the existing `packages/react/ds-global/.storybook/` directory for the configuration structure. The shared `@canonical/storybook-config` package provides the base configuration factory.

For component packages with Storybook, consider adding a Chromatic workflow for visual regression testing. Copy an existing workflow from `.github/workflows/chromatic.*.yml` and modify the path filters to match the new package and its dependencies.

## CI integration

New packages integrate into CI automatically through Lerna. The PR workflow runs `lerna run build:all`, `bun run check`, and `bun run test` across all packages. No manual CI configuration is needed for basic library or tool packages.

The tag workflow publishes all public packages to npm. Packages with `"private": true` in package.json are excluded from publishing but still participate in builds and tests.

If your PR introduces a brand-new npm package, the first publish must be done manually before regular release automation can pick it up. **This is a manual human step — it requires interactive npm authentication (2FA) and access to npmjs.com, so it cannot be automated or performed by an AI agent.** From inside the package directory, run `npm publish --access public` when the package is ready. After publishing, run `bun run publish:status` from the repository root to confirm the package appears in the registry.

The automated release workflow publishes via [OIDC trusted publishing](https://docs.npmjs.com/trusted-publishers), so after the first manual publish you must configure a trusted publisher for the new package on npmjs.com (repo `canonical/pragma`, workflow `tag.yml`) and set its publishing access to disallow tokens. The order matters: the package must already be published, because the trusted-publisher settings live on the package's npm page, which does not exist until the first publish — you cannot configure OIDC in advance. Until the trusted publisher is configured, the tag workflow cannot publish new versions of the package. You can confirm which packages are publishing with provenance by running `bun run publish:status` from the repository root and reading the Provenance column. See [How to publish a package](./PUBLISH_A_PACKAGE.md#authentication-oidc-trusted-publishing) for the full procedure and [Verifying provenance](./PUBLISH_A_PACKAGE.md#verifying-provenance) for how to interpret the status output.

Chromatic workflows require explicit configuration because they run per-package with path filtering. If your package has a Storybook, create a workflow file that triggers on changes to the package and its dependencies. The workflow template at `.github/workflows/chromatic._template.yml` provides the common structure.

## Checklist

Before committing a new package, verify that all requirements are met.

Configuration completeness:
- package.json exists with name, version, license, exports, and scripts
- tsconfig.json extends the appropriate base configuration
- tsconfig.build.json configures compilation output
- biome.json extends @canonical/biome-config
- vitest.config.ts configures the test runner
- src/index.ts exports the public API

Validation:
- The root `package.json` `workspaces` array matches the package's directory (only needed for a package in a **new** domain directory, and easy to forget precisely because most packages do not need it)
- `bunx nx show projects` and `bun run check:ranges` report the same package count — a disagreement means a glob is missing
- `readlink node_modules/@canonical/<name>` resolves into the working tree, not to a downloaded copy
- `bun install` succeeds from the monorepo root
- `bun run build` succeeds in the package directory
- `bun run check` passes (includes webarchitect validation)
- `bun run test` passes (or no tests exist yet)

Documentation:
- README.md exists with package description and usage
- Export names are descriptive and documented in types

Integration:
- Version matches current monorepo version
- License matches ruleset requirements (LGPL-3.0 for library, GPL-3.0 for tool)
- check:webarchitect script uses the correct ruleset
- First-time publish for new packages completed manually by running `npm publish --access public` from inside the package directory, then verified with `bun run publish:status`
- Trusted publisher configured on npmjs.com for the new package (repo `canonical/pragma`, workflow `tag.yml`) and publishing access set to disallow tokens, so the automated workflow can publish future versions
