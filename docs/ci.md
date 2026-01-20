# CI/CD

This document explains Pragma's continuous integration and deployment pipeline. It covers the philosophy behind the pipeline design, the workflows that implement it, and practical guidance for working with builds and releases.

## Goals

A working CI pipeline achieves: correctness at every layer (compile, lint, test, visual), fast feedback while context is fresh, confidence that passing main is publishable, reproducibility between local and CI environments, and visual stability through Chromatic baselines.

These goals require certain infrastructure to be in place.

## Prerequisites

### Secrets

- `NODE_AUTH_TOKEN` - npm Granular Access Token with publish permission for @canonical scope
- `CHROMATIC_TOKEN_DS_GLOBAL` - Project token from Chromatic for ds-global
- `CHROMATIC_TOKEN_DS_APP` - Project token for ds-app
- `CHROMATIC_TOKEN_DS_APP_LAUNCHPAD` - Project token for ds-app-launchpad

### Repository Settings

- Branch protection requiring `build-gate` as status check
- Actions permissions for creating tags and pushing version commits

### Local Alignment

- Node 22 or 24 (matching matrix)
- Bun 1.2.19 (matching matrix)
- Run `bun install` after pulling

## Why This Pipeline Exists

Design system monorepos present unique challenges for continuous integration. Changes to foundational packages like `ds-types` or `styles-primitives` cascade through many dependent packages. Visual correctness matters as much as functional correctness; a button that passes all unit tests but renders with the wrong colour is still broken. Multiple teams consume these packages, so regressions have wide impact.

The pipeline addresses these challenges through layered verification. Each layer catches a different class of problem.

**Build** compiles TypeScript to JavaScript and copies CSS files to distribution directories. Build failures indicate syntax errors, missing imports, or type errors that prevent compilation. Every package must build successfully before any other checks run.

**Check** enforces code standards. Biome verifies formatting and linting rules. TypeScript verifies type correctness with `--noEmit`. Webarchitect verifies that packages conform to architectural rules like license requirements and export structure. Check failures indicate code that works but violates project conventions.

**Test** verifies behaviour. Vitest runs unit tests and SSR tests for each package. Test failures indicate code that compiles and follows conventions but does not behave correctly.

**Visual** verifies appearance. Chromatic captures screenshots of every Storybook story and compares them against baselines. Visual failures indicate code that works correctly but looks wrong.

This layering means that when a check fails, you know what category of problem to investigate. A build failure is different from a test failure, which is different from a visual regression.

## Tooling Decisions

The pipeline uses several tools, each chosen for specific reasons.

**Lerna** manages versioning and publishing. It understands the monorepo structure, tracks which packages have changed since the last release, generates changelogs from conventional commits, and publishes packages to npm in the correct dependency order. Lerna's fixed versioning mode keeps all packages at the same version number, eliminating compatibility matrices.

**Nx** provides task orchestration and caching. When you run `bun run build`, Nx determines the dependency graph between packages and builds them in the correct order. When you run the same command again, Nx skips packages that haven't changed. This caching dramatically speeds up CI builds after the first run.

**Bun** handles package management. It resolves workspace dependencies, installs packages, and runs scripts. Bun is significantly faster than npm or yarn for these operations. However, Bun does not yet fully support all Node.js APIs that Storybook and Lerna require.

**Node.js** runs Storybook and Lerna. The pipeline installs both Bun and Node, using Bun for package management and Node for tools that require fuller Node.js compatibility. The build matrix tests against Node 22 (LTS) and Node 24 (current) to catch compatibility issues.

**Chromatic** provides visual regression testing. It captures screenshots of Storybook stories, stores baselines, and highlights visual differences between builds. Chromatic runs as a separate workflow with path filtering, so changes to `react-ds-global` only trigger visual tests for that package. This conserves snapshot credits while ensuring visual changes are reviewed.

## Workflows

### Pull Request Workflow (pr.yml)

The pull request workflow runs on every PR. It uses a build matrix to test against multiple Node versions.

```yaml
strategy:
  matrix:
    bun-version: ['1.2.19']
    node-version: ['22', '24']
```

Each matrix job performs three steps:

1. `lerna run build:all` builds all packages and their Storybook configurations
2. `bun run check` runs Biome, TypeScript, and webarchitect checks
3. `bun run test` runs Vitest for all packages

A separate `build-gate` job waits for all matrix jobs to complete. This gate job is the required status check for branch protection; PRs cannot merge until all matrix combinations pass.

### Tag Workflow (tag.yml)

The tag workflow creates releases. It runs manually from GitHub Actions and only works from the main branch.

The workflow accepts a release type input with five options: `experimental`, `alpha`, `beta`, `rc`, and `stable`. This determines how versions are bumped. Pre-release types append an identifier and increment a pre-release number (e.g., `0.11.0` → `0.12.0-beta.0` → `0.12.0-beta.1`). The stable type graduates the current pre-release to a stable version (e.g., `0.12.0-rc.0` → `0.12.0`).

The workflow has three jobs:

1. **build** runs checks and tests to verify the release candidate
2. **version** bumps version numbers, generates changelogs, commits, and creates a git tag
3. **publish** checks out the tagged commit and publishes packages to npm

The version job uses Lerna's conventional commit analysis to determine version bumps. A `feat:` commit triggers a minor bump, a `fix:` commit triggers a patch bump, and a `BREAKING CHANGE:` footer triggers a major bump.

### Chromatic Workflows

Each Storybook package has a dedicated Chromatic workflow. These workflows use path filtering to run only when relevant files change.

```yaml
on:
  pull_request:
    paths:
      - configs/storybook/**
      - packages/styles/**
      - packages/react/ds-global/**
```

The path list includes both the package itself and its dependencies. Changes to `styles` packages trigger Chromatic for all component packages because style changes affect visual output.

Chromatic workflows use a shared template (`.github/workflows/chromatic._template.yml`) that defines the common build and publish steps. Each package workflow passes its working directory and external dependencies to the template.

On pull requests, Chromatic requires manual approval for visual changes. On pushes to main, changes are automatically accepted as new baselines. This allows reviewing visual changes during PR review while keeping baselines current after merge.

## How to Release

Releases require write access to the repository and must run from the main branch.

Before starting a release, verify that:
- You are on the main branch with no uncommitted changes
- The latest CI build on main passed
- You have determined the appropriate release type

To create a release:

1. Navigate to Actions in the GitHub repository
2. Select "Update package versions" from the workflow list
3. Click "Run workflow"
4. Select the release type from the dropdown
5. Click "Run workflow" to start

The workflow takes approximately 5-10 minutes to complete. You can monitor progress in the Actions tab. When finished, the workflow will have:

- Committed version bumps to all package.json files
- Updated CHANGELOG.md files with entries from conventional commits
- Created a git tag (e.g., `v0.12.0`)
- Published all public packages to npm

Verify the release by checking:
- The git tag appears in the repository's tag list
- Packages appear on npm with the correct version
- The CHANGELOG.md files contain expected entries

## Troubleshooting

### Build fails in CI but works locally

This usually indicates an environment difference. Check which Node version the failing job used and ensure your local Node matches. Run `node --version` and compare against the matrix configuration.

Clear local caches and rebuild from scratch:

```bash
bun run special:clean
bun install
bun run build
bun run check
bun run test
```

If the failure involves Nx caching, the CI cache may contain stale artifacts. Nx caches are keyed by file content hashes; if a file changed in a way that doesn't affect its hash (unlikely but possible), the cache may serve outdated results. Re-running the workflow usually resolves this.

### Chromatic shows unexpected visual changes

Review the visual diff in Chromatic's web interface. Each changed story shows a side-by-side comparison with highlighted differences.

If the changes are intentional (you updated styles or component structure), accept them in Chromatic. Accepting creates new baselines for future comparisons.

If the changes are unintentional, investigate the cause. Common sources include:
- Font rendering differences between environments
- Timing-dependent animations captured at different frames
- CSS changes in shared style packages

For font issues, ensure Storybook loads fonts consistently. For animation issues, consider disabling animations in Storybook's test mode or using Chromatic's delay options.

### NPM publish fails with "version already exists"

This happens when a previous release attempt partially succeeded. The git tag was created and pushed, but publishing failed partway through. Some packages may have published while others did not.

To recover:

1. Delete the git tag locally and remotely:
   ```bash
   git tag -d v0.12.0
   git push origin :refs/tags/v0.12.0
   ```

2. Reset the version commits:
   ```bash
   git reset --hard HEAD~1
   git push --force-with-lease
   ```

3. Identify which packages did publish and manually bump their versions in package.json to avoid conflicts

4. Re-run the release workflow

For partial publish failures, consider publishing the remaining packages manually with `lerna publish from-package --yes --no-private` after fixing the underlying issue.

### Workflow cannot find secrets

Workflows require repository secrets for npm publishing (`NODE_AUTH_TOKEN`) and Chromatic (`CHROMATIC_TOKEN_*`). If secrets are missing or expired:

1. For npm: Generate a new Granular Access Token at npmjs.com with publish permissions for @canonical scope. Add it as `NODE_AUTH_TOKEN` in repository secrets.

2. For Chromatic: Get the project token from Chromatic's project settings. Add it as the appropriate `CHROMATIC_TOKEN_*` secret.

Secrets are only available to workflows running in the repository context, not from forks. Pull requests from forks will not have access to secrets, which is why Chromatic workflows skip or fail gracefully for fork PRs.
