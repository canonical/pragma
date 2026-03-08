# @canonical/summon-monorepo

Monorepo generator for [Summon](https://www.npmjs.com/package/@canonical/summon) — scaffolds a new Bun + Lerna monorepo with CI, release, and shared configuration.

## Overview

This generator creates a complete monorepo shell with opinionated defaults aligned to Canonical's engineering standards. It does **not** create an initial package — use [`@canonical/summon-package`](https://www.npmjs.com/package/@canonical/summon-package) to add packages after setup.

## Usage

```bash
# Interactive mode
bunx summon monorepo

# With arguments
summon monorepo --name=my-project --description="My awesome project"
```

## What's Generated

```
<repo>/
├── .github/
│   ├── actions/
│   │   ├── lerna-version/    # Version bump + changelog action
│   │   │   ├── action.yml
│   │   │   ├── version.sh
│   │   │   └── git-commit.sh
│   │   ├── setup-env/        # Bun + dependency install
│   │   │   └── action.yml
│   │   └── setup-git/        # Git CLI config
│   │       └── action.yml
│   ├── workflows/
│   │   ├── ci.yml            # PR/push CI (check + build-and-test)
│   │   ├── pr-lint.yml       # Conventional commit enforcement
│   │   └── tag.yml           # Release workflow (version, tag, publish)
│   └── PULL_REQUEST_TEMPLATE.md
├── packages/                  # Empty (use summon-package to add packages)
├── scripts/
│   └── publish-status.ts      # Compare local vs. npm registry versions
├── .gitignore
├── biome.json                 # Extends @canonical/biome-config
├── lerna.json                 # Fixed versioning
├── LICENSE
├── nx.json                    # Nx caching + target defaults
├── package.json               # Lerna scripts, metadata
├── README.md
└── tsconfig.json              # Extends chosen TypeScript config
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | _(required)_ | Monorepo name (kebab-case) |
| `description` | string | `""` | Description |
| `license` | `LGPL-3.0` \| `GPL-3.0` | `LGPL-3.0` | Root license |
| `typescriptConfig` | string | `@canonical/typescript-config-base` | Shared TypeScript config |
| `repository` | string | `""` | GitHub repository URL |
| `bunVersion` | string | `1.3.9` | Pinned Bun version for CI |
| `initGit` | boolean | `true` | Initialize git repository |
| `runInstall` | boolean | `true` | Run `bun install` after creation |

## Opinionated Defaults

| Decision | Value |
|----------|-------|
| Package manager | Bun (pinned, lockfile committed) |
| Module system | ESM (`"type": "module"`) |
| Build output | `dist/esm/` + `dist/types/` |
| Test runner | Vitest with v8 coverage |
| Test file pattern | `*.tests.ts` (plural) |
| Linter/formatter | Biome via `@canonical/biome-config` |
| Versioning | Lerna fixed mode |
| Orchestration | Lerna + Nx caching |
| CI | Two parallel jobs (check + build-and-test) |
| PR lint | Conventional commits (`amannn/action-semantic-pull-request@v6`) |
| Merge strategy | Squash merge with PR title |
| Release | `tag.yml` workflow_dispatch with `NPM_AUTH_TOKEN` |

## Post-Setup Actions

After running the generator:

1. **Configure `NPM_AUTH_TOKEN` secret** in GitHub repo settings
2. **Configure squash merge** as the default (or only) merge strategy
3. **Set "Default commit message"** to "Pull request title"
4. **Generate initial changelogs** (optional): `bun run lerna version --conventional-commits --no-git-tag-version --no-push --yes`
5. **Initial publish** (optional): Run the `tag.yml` workflow from GitHub Actions
6. **Add packages** using `summon-package`

## Development

```bash
# Run checks
bun run check

# Run tests
bun run test
```

## License

GPL-3.0
