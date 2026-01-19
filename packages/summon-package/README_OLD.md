# @canonical/summon-package

Package scaffolding for the pragma monorepo - generate new npm packages with proper configuration.

## What You Get

Production-ready package structures with:
- TypeScript configuration (extends workspace config)
- Biome linting configuration
- Proper package.json with scripts and dependencies
- README template
- Optional React support
- Optional Storybook setup
- Optional CLI entry point

## Installation

```bash
# Install in a project
bun add @canonical/summon-package

# Or link globally (from this package directory)
bun link        # for bun users
npm link        # for npm users
```

Requires `@canonical/summon` as a peer dependency.

## Quick Start

```bash
# Interactive mode - prompts guide you through options
summon package

# Specify options directly
summon package --name=@canonical/my-tool --type=tool-ts

# Preview what will be created
summon package --name=@canonical/my-tool --type=tool-ts --dry-run
```

## Package Types

### tool-ts

TypeScript tool that runs directly from `src/` (no build step).

- License: GPL-3.0
- Entry: `src/index.ts`
- Examples: summon, webarchitect

```bash
summon package --name=@canonical/my-tool --type=tool-ts
```

### library

Publishable library with `dist/` build output.

- License: LGPL-3.0
- Entry: `dist/esm/index.js`
- Examples: utils, ds-types

```bash
summon package --name=@canonical/my-lib --type=library
```

### css

CSS-only package (no TypeScript, no build).

- License: LGPL-3.0
- Entry: `src/index.css`
- Examples: styles/primitives, styles/modes

```bash
summon package --name=@canonical/my-styles --type=css
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--name` | Full package name (e.g., @canonical/my-package) | `@canonical/my-package` |
| `--type` | Package type: `tool-ts`, `library`, or `css` | `tool-ts` |
| `--description` | Package description | empty |
| `--with-react` | Include React dependencies | false |
| `--with-storybook` | Include Storybook setup | false |
| `--with-cli` | Include CLI binary entry point | false |
| `--no-run-install` | Skip package manager install | runs install |

### Global

| Flag | Description |
|------|-------------|
| `--dry-run`, `-d` | Preview without writing files |
| `--yes`, `-y` | Skip confirmation prompts |
| `--help` | Show all options |

## Examples

```bash
# Create a TypeScript tool
summon package --name=@canonical/my-tool --type=tool-ts

# Create a React library
summon package --name=@canonical/my-lib --type=library --with-react

# Create a CLI tool
summon package --name=@canonical/my-cli --type=tool-ts --with-cli

# Create a CSS package
summon package --name=@canonical/my-styles --type=css

# Skip install step (useful in CI)
summon package --name=@canonical/my-pkg --type=library --no-run-install
```

## Generated Structure

### tool-ts

```
my-tool/
├── package.json
├── tsconfig.json
├── biome.json
├── README.md
└── src/
    └── index.ts
```

### library

```
my-lib/
├── package.json
├── tsconfig.json
├── biome.json
├── README.md
└── src/
    └── index.ts
```

### css

```
my-styles/
├── package.json
├── biome.json
├── README.md
└── src/
    └── index.css
```

## Auto-Detection

The generator automatically detects:

- **Monorepo**: Uses `lerna.json` version when in the pragma monorepo
- **Package manager**: Detects bun/npm/yarn/pnpm for the install step

## License

GPL-3.0
