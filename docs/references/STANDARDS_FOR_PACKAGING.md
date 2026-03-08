# Standards for Packaging  Monorepo Specification

This document is the canonical specification for monorepo structure, configuration, and tooling. It defines every decision that the `summon-monorepo` generator encodes and that `webarchitect` validates. Any monorepo that follows this specification is compatible with the shared CI, release, and dependency-management infrastructure.

The specification is organized into twelve domains. Each domain has a rationale section explaining *why* the rule exists, a rules table for quick auditing, and inline file contents showing exactly what the generator produces.

---

## Contents

1. [M1  Runtime](#m1--runtime)
2. [M2  Orchestration](#m2--orchestration)
3. [M3  Shared Configuration](#m3--shared-configuration)
4. [M4  Testing](#m4--testing)
5. [M5  Build](#m5--build)
6. [M6  Scripts](#m6--scripts)
7. [M7  CI](#m7--ci)
8. [M8  Release](#m8--release)
9. [M9  Git](#m9--git)
10. [M10  Dependencies](#m10--dependencies)
11. [M11  Layout](#m11--layout)
12. [M12  Metadata](#m12--metadata)
13. [Generator Parameters](#generator-parameters)
14. [Post-Setup Checklist](#post-setup-checklist)

---

## M1  Runtime

### Rationale

A pinned package manager version and a committed lockfile guarantee that every developer, CI runner, and deployment target resolves the same dependency tree. Bun provides faster installs and native workspace support. Pinning the version in CI prevents silent breakage from upstream Bun releases.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M1.1 | Package manager is **Bun** | `bun.lock` exists |
| M1.2 | Bun version is pinned in `.github/actions/setup-env/action.yml` | version string is not `latest` |
| M1.3 | `bun.lock` is committed (not gitignored) | file tracked by git |
| M1.4 | CI uses `bun install --frozen-lockfile` | frozen-lockfile flag present |

### File: `.github/actions/setup-env/action.yml`

```yaml
name: Setup environment
description: Installs Bun and dependencies

inputs:
  bun-version:
    default: "1.3.9"
    description: Version of Bun to use

runs:
  using: composite
  steps:
    - name: Setup Bun
      uses: oven-sh/setup-bun@v2
      with:
        bun-version: ${{ inputs.bun-version }}

    - name: Install dependencies
      shell: bash
      run: bun install --frozen-lockfile
```

---

## M2  Orchestration

### Rationale

Lerna provides workspace-aware versioning and publishing. Nx provides task caching and dependency-aware execution ordering. Together they eliminate the need for manual `--filter` flags in root scripts and ensure that builds, checks, and tests run in correct dependency order. Fixed versioning keeps all packages at one version number, eliminating compatibility matrices between packages.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M2.1 | **Lerna** handles workspace task execution and versioning | `lerna.json` exists |
| M2.2 | **Nx** provides caching and dependency-aware task ordering | `nx.json` exists |
| M2.3 | Root scripts use `lerna run <script>`, never `bun run --filter` | scripts use lerna |
| M2.4 | Fixed versioning: all packages share one version number | `lerna.json` version is a string, not `"independent"` |

### File: `lerna.json`

```json
{
  "$schema": "node_modules/lerna/schemas/lerna-schema.json",
  "version": "0.0.1"
}
```

### File: `nx.json`

```json
{
  "cli": {
    "packageManager": "bun"
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "build:all": {
      "dependsOn": ["^build:all"],
      "cache": true
    },
    "check": {
      "dependsOn": ["^check"],
      "cache": true
    },
    "check:fix": {
      "dependsOn": ["^check:fix"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": true
    }
  }
}
```

The `^` prefix in `dependsOn` means "run this target in all upstream dependencies first." The `test` target depends on `^build` rather than `^test` because tests should run against freshly built code but do not require upstream tests to pass first.

---

## M3  Shared Configuration

### Rationale

Shared configuration packages (`@canonical/biome-config`, `@canonical/typescript-config-*`) ensure consistency across all monorepos without copy-pasting config files. Packages extend the npm packages directly  not through relative root paths  because `webarchitect` enforces this in the `package` ruleset, and because relative paths break when packages are consumed outside the monorepo.

The root `tsconfig.json` and `biome.json` exist for editor tooling; packages do not extend them.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M3.1 | TypeScript config consumed from `@canonical/typescript-config-*` npm package | `extends` references npm package |
| M3.2 | Biome config consumed from `@canonical/biome-config` npm package | `extends` references npm package |
| M3.3 | Packages extend npm packages directly, not relative root paths | no `../../` in extends |
| M3.4 | Architecture validated by `@canonical/webarchitect` with appropriate ruleset | `check:webarchitect` script present |
| M3.5 | Root `tsconfig.json` extends the chosen shared config package | `extends` field present |
| M3.6 | Package `tsconfig.json` extends appropriate variant for its domain | `extends` field present |
| M3.7 | `tsconfig.build.json` used for production builds | file exists for library packages |
| M3.8 | Build output: `dist/esm/` for JS, `dist/types/` for declarations | output dirs correct |
| M3.9 | `declarationMap: true` and `sourceMap: true` enabled in build config | flags set |
| M3.10 | Root `biome.json` extends `@canonical/biome-config` with repo-specific scope | `extends` + `files.includes` |
| M3.11 | Package `biome.json` extends `@canonical/biome-config` directly | `extends` set |

### File: Root `tsconfig.json`

```json
{
  "extends": "@canonical/typescript-config-base"
}
```

The root config uses `@canonical/typescript-config-base` (ES2023, no DOM). Packages that need DOM types (web components, browser-facing libraries) use `@canonical/typescript-config-webcomponents` in their own `tsconfig.json`.

### File: Root `biome.json`

```json
{
  "extends": ["@canonical/biome-config"],
  "files": {
    "includes": ["packages/*/src/**", "scripts/**", "*.json"]
  }
}
```

The `files.includes` scopes Biome to source code, scripts, and root JSON config files. This keeps Biome from processing `node_modules`, `dist`, and other generated content.

### File: Package `tsconfig.json` (library)

```json
{
  "extends": "@canonical/typescript-config-base",
  "compilerOptions": {
    "baseUrl": "src",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.tests.ts"]
}
```

### File: Package `tsconfig.build.json` (library)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist/esm",
    "declaration": true,
    "declarationDir": "dist/types",
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.tests.ts"]
}
```

### File: Package `biome.json`

```json
{
  "extends": ["@canonical/biome-config"],
  "files": {
    "includes": ["**/src/**", "**/*.json"]
  }
}
```

### TypeScript Config Variants

| Package type | Extends | Provides |
|-------------|---------|----------|
| Base / Node / framework-agnostic | `@canonical/typescript-config-base` | `ES2023`, `NodeNext`, `strict` |
| Lit web components | `@canonical/typescript-config-webcomponents` | Base + `DOM`, `experimentalDecorators`, `useDefineForClassFields: false` |
| React components | `@canonical/typescript-config-react` | Base + `DOM`, JSX settings |

When a package needs DOM types but uses a base config (e.g., a framework-agnostic network layer that references `HeadersInit`), add `"lib": ["ES2023", "DOM"]` as a local override in the package's `tsconfig.json`.

### Webarchitect Rulesets

| Ruleset | License | Build output | Use for |
|---------|---------|-------------|---------|
| `library` | LGPL-3.0 | `dist/esm/`, `dist/types/` | Publishable libraries |
| `tool` | GPL-3.0 | `dist/esm/`, `dist/types/` | Compiled CLI tools |
| `tool-ts` | GPL-3.0 | Runs from `src/` | TypeScript-only tools (executed by Bun directly) |

---

## M4  Testing

### Rationale

Vitest is the standard test runner. Test files use the `*.tests.ts` plural naming convention. This convention is enforced in `tsconfig.json` excludes, `vitest.config.ts` includes, and Biome file scoping. Coverage is provided by `@vitest/coverage-v8`, hoisted to the root so all packages share one version.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M4.1 | Test runner is **Vitest** | `vitest` in devDependencies |
| M4.2 | Test file naming: `*.tests.ts` (plural, not `*.test.ts`) | no singular test files |
| M4.3 | Test files live alongside source in `src/` | test files under `src/` |
| M4.4 | Coverage provider: `@vitest/coverage-v8` hoisted to root | dep in root `package.json` |
| M4.5 | `test:coverage` script at both root and package level | scripts exist |
| M4.6 | Vitest include pattern: `src/**/*.tests.ts` | include pattern set |

### File: Package `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.tests.ts"],
  },
});
```

`globals: true` makes `describe`, `it`, and `expect` available without imports. The `include` pattern matches the plural `*.tests.ts` convention.

---

## M5  Build

### Rationale

All packages use ESM (`"type": "module"`). Build output is split into `dist/esm/` for JavaScript and `dist/types/` for TypeScript declarations. The `exports` map uses conditional exports with `import`, `types`, and `default` conditions so that bundlers and TypeScript resolve the correct files. The `files` field ensures only `dist` is published to npm.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M5.1 | Module format is ESM (`"type": "module"`) | `type` = `module` |
| M5.2 | JS output: `dist/esm/index.js` | `module` field correct |
| M5.3 | Type declarations: `dist/types/index.d.ts` | `types` field correct |
| M5.4 | `files` field in package.json: `["dist"]` | `files` field set |
| M5.5 | `exports` map with `import`, `types`, and `default` conditions | exports configured |

### Exports Map

```json
{
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "types": "./dist/types/index.d.ts",
      "default": "./dist/esm/index.js"
    }
  }
}
```

Packages with multiple entry points add additional keys (e.g., `"./utils"`, `"./preview"`). Each key follows the same `import`/`types`/`default` structure.

---

## M6  Scripts

### Rationale

Root scripts delegate to Lerna, which orchestrates execution across packages with Nx caching. Package scripts follow a consistent naming scheme. The `check:fix` script does not call `webarchitect` because webarchitect is read-only validation. The `special:clean` script provides a full reset for broken local states.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M6.1 | `build` runs `lerna run build` | script exists at root |
| M6.2 | `build:all` runs `lerna run build:all` | script exists at root |
| M6.3 | `check` runs `lerna run check` | script exists at root |
| M6.4 | `check:fix` runs `lerna run check:fix` | script exists at root |
| M6.5 | `test` runs `lerna run test` | script exists at root |
| M6.6 | `test:coverage` runs `lerna run test:coverage` | script exists at root |
| M6.7 | `special:clean` resets Nx cache, removes deps and dist | script exists at root |
| M6.8 | `publish:manual` builds and publishes all public packages | script exists at root |
| M6.9 | `publish:status` compares local vs registry versions | script exists at root |

### Root `package.json` scripts

```json
{
  "scripts": {
    "build": "lerna run build",
    "build:all": "lerna run build:all",
    "check": "lerna run check",
    "check:fix": "lerna run check:fix",
    "test": "lerna run test",
    "test:coverage": "lerna run test:coverage",
    "lerna": "lerna",
    "special:clean": "bun run nx reset && lerna clean --yes && rm -rf node_modules **/dist **/node_modules",
    "publish:manual": "bun run build && npm publish --access public --workspaces",
    "publish:status": "bun scripts/publish-status.ts"
  }
}
```

### Package scripts (library)

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "build:all": "bun run build",
    "check": "bun run check:biome && bun run check:ts && bun run check:webarchitect",
    "check:fix": "bun run check:biome:fix && bun run check:ts",
    "check:biome": "biome check",
    "check:biome:fix": "biome check --write",
    "check:ts": "tsc --noEmit",
    "check:webarchitect": "webarchitect library",
    "test": "bun run test:vitest",
    "test:vitest": "vitest run",
    "test:vitest:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Note: `check:fix` calls only `check:biome:fix` and `check:ts`. It does not call `check:webarchitect` because webarchitect has no fix mode  it is read-only validation.

---

## M7  CI

### Rationale

CI runs two parallel jobs: `check` (linting, type-checking, architecture validation) and `build-and-test` (compilation, tests). Parallel jobs give faster feedback. A separate `pr-lint.yml` validates that PR titles follow conventional commits, which is required for automated changelog generation.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M7.1 | `ci.yml` runs on push to main and on PRs | workflow triggers set |
| M7.2 | CI has two parallel jobs: `check` + `build-and-test` | both jobs present |
| M7.3 | `pr-lint.yml` validates PR title follows conventional commits | workflow exists |
| M7.4 | `tag.yml` is the release workflow (`workflow_dispatch`) | workflow exists |
| M7.5 | Release workflow: builds, tests, versions, publishes | all steps present |

### File: `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    name: Code quality checks
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Setup environment
        uses: ./.github/actions/setup-env

      - name: Code quality checks
        run: bun run check

  build-and-test:
    name: Build & test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Setup environment
        uses: ./.github/actions/setup-env

      - name: Build
        run: bun run build

      - name: Test
        run: bun run test
```

### File: `.github/workflows/pr-lint.yml`

```yaml
name: PR Lint
on:
  pull_request:
    types:
      - opened
      - edited
      - synchronize
      - reopened
permissions:
  pull-requests: read

jobs:
  validate-pr-metadata:
    name: Validate PR metadata
    runs-on: ubuntu-latest
    steps:
      - name: Verify conventional commit-compliant PR title
        uses: amannn/action-semantic-pull-request@v6
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### File: `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Done

[List of work items including drive-bys]

Fixes [list issues/bugs if needed]

## QA

- [Add QA steps]

### PR readiness check

- [ ] PR should have one of the following labels:
  - `Feature`, `Breaking Change`, `Bug`, `Documentation`, `Maintenance`.
- [ ] PR title follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format.
- [ ] All packages define the required scripts in `package.json`:
  - [ ] All packages: `check`, `check:fix`, and `test`.
  - [ ] Packages with build steps: `build` to build the package, `build:all` to build all artifacts.

## Screenshots

[if relevant, include a screenshot or screen capture]
```

---

## M8  Release

### Rationale

Releases are triggered by a manual `workflow_dispatch` on the `tag.yml` workflow. The workflow builds and tests first, then uses Lerna's `--conventional-commits` flag to determine version bumps from commit messages, generate changelogs, and create annotated git tags. Publishing uses `NPM_AUTH_TOKEN` (not `NODE_AUTH_TOKEN`). A `DEPLOY_KEY` SSH key allows the version job to push commits and tags back to the repo.

Release types follow a progression: `experimental` ’ `alpha` ’ `beta` ’ `rc` ’ `stable`. Pre-release versions append an identifier (e.g., `0.1.0-beta.0`). The `stable` type graduates the current pre-release.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M8.1 | Lerna fixed versioning (all packages share one version) | version mode = fixed |
| M8.2 | Conventional commits drive changelog generation | `--conventional-commits` in version script |
| M8.3 | Release types: experimental, alpha, beta, rc, stable | types in `tag.yml` |
| M8.4 | npm auth uses `NPM_AUTH_TOKEN` secret | correct secret name in workflow |
| M8.5 | CHANGELOG.md auto-generated by `lerna version --conventional-commits` | changelog generation enabled |

### File: `.github/workflows/tag.yml`

```yaml
name: Update package versions
on:
  workflow_dispatch:
    inputs:
      release_type:
        description: "Release type"
        default: "experimental"
        required: false
        type: choice
        options:
          - "experimental"
          - "alpha"
          - "beta"
          - "rc"
          - "stable"
env:
  MAIN_BRANCH: "refs/heads/main"

jobs:
  build:
    name: Build & test
    runs-on: ubuntu-latest
    steps:
      - name: Validate input
        run: |
          if [[ "${{ github.ref }}" != "${{ env.MAIN_BRANCH }}" ]]; then
            echo "This action can only be run on the main branch"
            exit 1
          fi

      - name: Checkout repository
        uses: actions/checkout@v6
        with:
          fetch-depth: 1

      - name: Setup environment
        uses: ./.github/actions/setup-env

      - name: Code quality checks
        run: bun run check

      - name: Test
        run: bun run test

  version:
    name: Bump package versions
    runs-on: ubuntu-latest
    needs: build
    outputs:
      VERSION: ${{ steps.lerna_version.outputs.VERSION }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6
        with:
          ssh-key: ${{ secrets.DEPLOY_KEY }}
          fetch-depth: 0

      - name: Setup environment
        uses: ./.github/actions/setup-env

      - name: Bump package versions, commit, tag, and push to Git
        id: lerna_version
        uses: ./.github/actions/lerna-version
        with:
          release_type: ${{ github.event.inputs.release_type }}

  publish:
    name: Publish packages
    runs-on: ubuntu-latest
    needs: version
    steps:
      - name: Checkout
        uses: actions/checkout@v6
        with:
          ref: v${{ needs.version.outputs.VERSION }}
          fetch-depth: 0

      - name: Setup Environment
        uses: ./.github/actions/setup-env

      - name: Setup Node, authenticate with NPM registry
        uses: actions/setup-node@v6
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org
        env:
          NPM_AUTH_TOKEN: ${{ secrets.NPM_AUTH_TOKEN }}

      - name: Publish packages
        run: lerna publish --yes --no-private from-package
```

### File: `.github/actions/lerna-version/action.yml`

```yaml
name: Version packages
description: Updates package version numbers and changelogs for changed packages.
inputs:
  release_type:
    description: "Release type"
    required: true
  tag_prefix:
    description: "Prefix for the git tag"
    required: false
    default: "v"
outputs:
  VERSION:
    description: "The new latest version number across all packages"
    value: ${{ steps.lerna_version.outputs.VERSION }}
runs:
  using: composite
  steps:
    - name: Version packages & generate changelogs
      shell: bash
      id: lerna_version
      run: ${{ github.action_path }}/version.sh ${{ inputs.release_type }}

    - name: Update lockfile
      shell: bash
      run: bun install --ignore-scripts

    - name: Apply formatting fixes
      shell: bash
      run: bun run check:fix

    - name: Setup Git CLI
      uses: ./.github/actions/setup-git
      with:
        name: ${{ github.actor }}

    - name: Commit and tag v${{ steps.lerna_version.outputs.VERSION }}
      shell: bash
      run: ${{ github.action_path }}/git-commit.sh ${{ inputs.tag_prefix }}${{ steps.lerna_version.outputs.VERSION }}
```

### File: `.github/actions/lerna-version/version.sh`

```bash
#!/bin/bash

# Bumps package versions and generates changelogs using Conventional Commits.
# INPUTS:  $1 = release_type (stable | experimental | alpha | beta | rc)
# OUTPUTS: VERSION written to $GITHUB_OUTPUT

if [ -z "$1" ]; then
  echo "Error: release_type argument is required."
  exit 1
fi

release_type="$1"
OLD_VERSION=$(jq -r '.version' lerna.json)

if [ "$release_type" == "stable" ]; then
  VERSION_ARGS="--conventional-graduate"
else
  VERSION_ARGS="--preid $release_type --conventional-prerelease"
fi

bun run lerna version --conventional-commits $VERSION_ARGS --no-git-tag-version --no-push --yes

NEW_VERSION=$(jq -r '.version' lerna.json)

if [ "$OLD_VERSION" == "$NEW_VERSION" ]; then
  echo "No version changes detected. Exiting."
  exit 1
elif [ "$release_type" != "stable" ]; then
  OLD_MAJOR=$(echo "$OLD_VERSION" | cut -d. -f1)
  NEW_MAJOR=$(echo "$NEW_VERSION" | cut -d. -f1)
  if [ "$NEW_MAJOR" -ne "$OLD_MAJOR" ]; then
    echo "Unexpected major version bump detected. Exiting."
    exit 1
  fi
fi

echo "VERSION=$NEW_VERSION" >> "$GITHUB_OUTPUT"
```

### File: `.github/actions/lerna-version/git-commit.sh`

```bash
#!/bin/bash

# Stages, commits, tags, and pushes to Git.
# INPUTS: $1 = tag (required)

if [ -z "$1" ]; then
  echo "Error: tag argument is required."
  exit 1
fi

tag="$1"

git add .
git commit -m "chore: version bump to $tag"
git tag "$tag" -m "$tag"
git push && git push --tags
```

### File: `.github/actions/setup-git/action.yml`

```yaml
name: Setup Git CLI
description: Sets up the Git CLI context
inputs:
  name:
    required: true
    description: Git username
  email:
    required: true
    description: Git email
    default: "webteam@canonical.com"

runs:
  using: composite
  steps:
    - name: Install dependencies
      shell: bash
      run: |
        git config --global user.email "${{ inputs.email }}"
        git config --global user.name "${{ inputs.name }}"
```

---

## M9  Git

### Rationale

Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) are required because Lerna parses them for version bumps and changelog generation. Squash merge with PR title as commit message ensures a clean linear history and that the conventional commit format is enforced at merge time via `pr-lint.yml`. The `.gitignore` is organized by category for readability.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M9.1 | Commit format: Conventional Commits | commit format enforced via `pr-lint.yml` |
| M9.2 | Merge strategy: squash merge with PR title as commit message | GitHub repo setting |
| M9.3 | Main branch requires CI to pass | branch protection enabled |
| M9.4 | PR template with Done / QA / Screenshots sections | template file exists |

### Conventional Commit Types

| Type | Version bump | Example |
|------|-------------|---------|
| `feat` | Minor | `feat(Button): add size variant` |
| `fix` | Patch | `fix(utils): handle null input` |
| `chore` | None | `chore(deps): bump vitest` |
| `docs` | None | `docs: update API reference` |
| `refactor` | None | `refactor(auth): extract middleware` |
| `test` | None | `test: add SSR coverage` |
| `ci` | None | `ci: pin Bun version` |
| `BREAKING CHANGE` footer | Major | Any type with `BREAKING CHANGE: ...` in footer |

### File: `.gitignore`

```gitignore
# OS & editor
Desktop.ini
Thumbs.db
._*
*.DS_Store
*~
\#*\#
.AppleDouble
.LSOverride
.spelling
.vscode
.idea

# Cache
*.bak
*.pyc
*-cache/
.yo-rc.json

# Local data
*.sqlite*
*.log
logs/
pids
*.pid
*.seed
.*-metadata

# Dependencies
.bundle/
node_modules/
vendor/
bower_components/
package-lock.json

# Build
dist/
storybook-static/
*.*.map
*.tsbuildinfo
coverage/

# Environment
.docker-project
.*.hash
.envrc
.env
.env.local
env/
env[23]/
.venv
.dotrun.json

# NX cache
.nx/

# AI / tools
session/
.claude/
.gemini/
GEMINI.md
.kg/
.mcp.json
sem.toml
sem_modules/
```

---

## M10  Dependencies

### Rationale

Renovate automates dependency updates. Batching families group related packages into single PRs to reduce noise. A weekly schedule limits disruption to Monday mornings. Automerge for patch and minor devDependency updates eliminates manual review for low-risk changes. The shared preset `@canonical/renovate-config` provides the core families; repos add domain-specific groups locally.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M10.1 | **Renovate** manages automated dependency updates | `renovate.json` exists |
| M10.2 | Schedule: weekly (before 9am on Monday) | schedule configured |
| M10.3 | Batching families group related dependencies into single PRs | groups configured |
| M10.4 | Automerge: patch and minor updates for devDependencies | automerge rules set |
| M10.5 | Labels: `Maintenance` applied to all Renovate PRs | label configured |
| M10.6 | Commit format: conventional commits (`chore(deps): ...`) | `semanticCommits` enabled |

### Core Batching Families

These families apply to every monorepo:

| Group | Packages |
|-------|----------|
| `biome` | `@biomejs/biome`, `@canonical/biome-config` |
| `typescript` | `typescript`, `@canonical/typescript-config-*` |
| `vitest` | `vitest`, `@vitest/*` |
| `lerna-nx` | `lerna`, `nx`, `@nx/*` |
| `canonical` | `@canonical/*` (catch-all, excluding biome-config and typescript-config variants) |

### Domain-Specific Families

These are added per-repo based on its dependency profile:

| Group | Packages | Repos |
|-------|----------|-------|
| `lit` | `lit`, `@lit/*`, `@lit-labs/*` | lit-relay, pragma |
| `relay` | `relay-runtime`, `relay-test-utils`, `relay-compiler`, `@types/relay-*` | lit-relay |
| `storybook` | `storybook`, `@storybook/*` | lit-relay (addon), pragma |
| `react` | `react`, `react-dom`, `@types/react*` | pragma |

### File: `renovate.json`

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "schedule": ["before 9am on monday"],
  "labels": ["Maintenance"],
  "semanticCommits": "enabled",
  "packageRules": [
    {
      "description": "Group Biome toolchain",
      "matchPackageNames": ["@biomejs/biome", "@canonical/biome-config"],
      "groupName": "biome"
    },
    {
      "description": "Group TypeScript toolchain",
      "matchPackageNames": ["typescript"],
      "matchPackagePrefixes": ["@canonical/typescript-config-"],
      "groupName": "typescript"
    },
    {
      "description": "Group Vitest ecosystem",
      "matchPackageNames": ["vitest"],
      "matchPackagePrefixes": ["@vitest/"],
      "groupName": "vitest"
    },
    {
      "description": "Group Lerna + Nx orchestration",
      "matchPackageNames": ["lerna", "nx"],
      "matchPackagePrefixes": ["@nx/"],
      "groupName": "lerna-nx"
    },
    {
      "description": "Group Canonical internal packages",
      "matchPackagePrefixes": ["@canonical/"],
      "groupName": "canonical",
      "excludePackageNames": ["@canonical/biome-config"],
      "excludePackagePrefixes": ["@canonical/typescript-config-"]
    },
    {
      "description": "Automerge patch/minor devDependencies",
      "matchDepTypes": ["devDependencies"],
      "matchUpdateTypes": ["patch", "minor"],
      "automerge": true
    }
  ]
}
```

Repos with domain-specific dependencies add their families as additional `packageRules` entries. The generator produces the core families; domain families are added manually after scaffolding.

---

## M11  Layout

### Rationale

A consistent repository layout makes navigation predictable. CI workflows and composite actions live in `.github/`. All workspace packages live in `packages/`. Monorepo-level scripts live in `scripts/`. Root configuration files are at the top level.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M11.1 | CI workflows in `.github/` | directory exists |
| M11.2 | All workspace packages in `packages/` | directory exists |
| M11.3 | Monorepo-level scripts in `scripts/` | directory exists |
| M11.4 | Root config files: `biome.json`, `lerna.json`, `nx.json`, `tsconfig.json` | files exist |
| M11.5 | `.gitignore` organized by category | file exists |

### Repository Structure

```
<repo>/
   .github/
      actions/
         lerna-version/
            action.yml          # Composite action: version + changelog
            version.sh          # Version bump script
            git-commit.sh       # Commit + tag + push script
         setup-env/
            action.yml          # Bun install with pinned version
         setup-git/
             action.yml          # Git user configuration
      workflows/
         ci.yml                  # PR and push CI
         pr-lint.yml             # Conventional commit PR title check
         tag.yml                 # Release workflow
      PULL_REQUEST_TEMPLATE.md    # PR template
   packages/                       # Workspace packages
   scripts/
      publish-status.ts           # Compare local vs registry versions
   .gitignore
   LICENSE                         # LGPL-3.0 or GPL-3.0
   README.md
   biome.json
   lerna.json
   nx.json
   package.json
   renovate.json
   tsconfig.json
```

Packages are added into `packages/` using `summon-package`. The monorepo generator does not create an initial package.

---

## M12  Metadata

### Rationale

Complete metadata in `package.json` ensures npm registry pages are useful and that consumers can find documentation, report bugs, and understand licensing. The `exports` map with conditional conditions ensures correct resolution in bundlers, TypeScript, and Node.

### Rules

| ID | Rule | Gate |
|----|------|------|
| M12.1 | `name` identifies the package | field present |
| M12.2 | `description` is non-empty | field present |
| M12.3 | `version` managed by Lerna | field present |
| M12.4 | `license` is `LGPL-3.0` (libraries) or `GPL-3.0` (tools) | license matches ruleset |
| M12.5 | `author` includes name and email | field present |
| M12.6 | `repository`, `bugs`, `homepage` point to correct URLs | fields present |
| M12.7 | `exports` has conditional map with `import`, `types`, `default` | exports configured |
| M12.8 | `files` explicitly lists published content | files field set |

### File: Root `package.json`

```json
{
  "name": "<name>-monorepo",
  "private": true,
  "version": "0.0.0",
  "description": "<description>",
  "author": {
    "email": "webteam@canonical.com",
    "name": "Canonical Webteam"
  },
  "repository": {
    "type": "git",
    "url": "<repository>"
  },
  "license": "<LGPL-3.0 | GPL-3.0>",
  "bugs": {
    "url": "<repository>/issues"
  },
  "homepage": "<repository>#readme",
  "workspaces": ["packages/*"],
  "scripts": { "..." : "see M6" },
  "devDependencies": {
    "@vitest/coverage-v8": "^4.0.0",
    "lerna": "^9.0.3",
    "nx": "^22.5.0"
  }
}
```

The root package is `"private": true` and version `"0.0.0"` because it is never published. The `workspaces` field tells Bun where to find packages.

### File: Package `package.json` (library)

```json
{
  "name": "@canonical/<name>",
  "description": "<description>",
  "version": "0.0.1",
  "type": "module",
  "license": "LGPL-3.0",
  "author": {
    "email": "webteam@canonical.com",
    "name": "Canonical Webteam"
  },
  "repository": {
    "type": "git",
    "url": "<repository>"
  },
  "bugs": {
    "url": "<repository>/issues"
  },
  "homepage": "<repository>#readme",
  "module": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "types": "./dist/types/index.d.ts",
      "default": "./dist/esm/index.js"
    }
  },
  "files": ["dist"],
  "scripts": { "..." : "see M6" },
  "devDependencies": {
    "@biomejs/biome": "2.4.5",
    "@canonical/biome-config": "^0.17.1",
    "@canonical/typescript-config-base": "^0.17.1",
    "@canonical/webarchitect": "^0.17.1",
    "typescript": "^5.9.3",
    "vitest": "^4.0.18"
  }
}
```

---

## Generator Parameters

The `summon-monorepo` generator accepts these parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | (required) | Monorepo name (used as `<name>-monorepo` in root package.json) |
| `description` | string | `""` | Monorepo description |
| `license` | `"LGPL-3.0"` or `"GPL-3.0"` | `"LGPL-3.0"` | Root license |
| `typescriptConfig` | string | `"@canonical/typescript-config-base"` | Shared TypeScript config package for root tsconfig |
| `repository` | string | `""` | GitHub repository URL |
| `bunVersion` | string | `"1.3.9"` | Pinned Bun version for CI |

After scaffolding the monorepo shell, use `summon-package` to add packages.

---

## Post-Setup Checklist

After running the generator:

1. Run `bun install` and commit `bun.lock`.
2. Configure GitHub repo secret `NPM_AUTH_TOKEN` (npm Granular Access Token with publish permission).
3. Configure GitHub repo secret `DEPLOY_KEY` (SSH deploy key with write access for version commits).
4. Configure GitHub repo settings:
   - Enable "Squash merging" as default merge strategy.
   - Set "Default commit message" to "Pull request title."
   - Disable "Allow merge commits" and "Allow rebase merging."
5. Enable Renovate GitHub App on the repository.
6. Use `summon-package` to add the first package.
7. Optionally generate initial changelogs: `bun run lerna version --conventional-commits --no-git-tag-version --no-push --yes`.
