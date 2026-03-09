# @canonical/summon-package

Package scaffolding for the pragma monorepo. Generates new npm packages with proper TypeScript configuration, linting, and workspace integration.

## Why Use This?

Setting up a new package in a monorepo involves:
- Creating the directory structure
- Writing package.json with correct workspace references
- Setting up TypeScript config that extends the workspace config
- Configuring Biome for linting
- Adding the right scripts
- Running package manager install

This generator does all of that in one command, ensuring consistency across the monorepo.

## Installation

```bash
bun add @canonical/summon-package
```

Requires `@canonical/summon` as a peer dependency:

```bash
bun add @canonical/summon
```

Or link globally:

```bash
cd /path/to/summon-package
bun link
```

---

## Quick Start

```bash
# Interactive — prompts guide you through options
summon package

# Direct — specify options
summon package --name=@canonical/my-tool --type=tool-ts

# With React support
summon package --name=@canonical/my-lib --type=library --with-react

# Preview first
summon package --name=@canonical/my-tool --type=tool-ts --dry-run
```

---

## Package Types

### `tool-ts` — TypeScript Tool

For internal tools that run directly from source. No build step needed.

**Use for:** CLI tools, scripts, generators, dev utilities

**License:** GPL-3.0 (internal only)

**Entry:** `src/index.ts`

```bash
summon package --name=@canonical/my-tool --type=tool-ts
```

Creates:

```
packages/my-tool/
├── package.json      # type: module, main: src/index.ts
├── tsconfig.json     # extends workspace config
├── biome.json        # extends workspace biome
├── README.md
└── src/
    └── index.ts      # export entry point
```

Example package.json:

```json
{
  "name": "@canonical/my-tool",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "license": "GPL-3.0",
  "scripts": {
    "check": "biome check .",
    "check:fix": "biome check --write ."
  }
}
```

### `library` — Publishable Library

For packages distributed to npm with compiled output.

**Use for:** Shared utilities, component libraries, public packages

**License:** LGPL-3.0 (can be used in proprietary projects)

**Entry:** `dist/esm/index.js`

```bash
summon package --name=@canonical/my-lib --type=library
```

Creates:

```
packages/my-lib/
├── package.json      # type: module, main: dist/esm/index.js
├── tsconfig.json     # extends workspace config, outDir: dist
├── biome.json
├── README.md
└── src/
    └── index.ts
```

Example package.json:

```json
{
  "name": "@canonical/my-lib",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/esm/index.js",
  "types": "dist/esm/index.d.ts",
  "license": "LGPL-3.0",
  "scripts": {
    "build": "tsc",
    "check": "biome check .",
    "check:fix": "biome check --write ."
  },
  "files": ["dist", "README.md"]
}
```

### `css` — CSS-Only Package

For pure CSS packages with no TypeScript.

**Use for:** Design tokens, CSS utilities, style primitives

**License:** LGPL-3.0

**Entry:** `src/index.css`

```bash
summon package --name=@canonical/my-styles --type=css
```

Creates:

```
packages/my-styles/
├── package.json      # main: src/index.css
├── biome.json
├── README.md
└── src/
    └── index.css
```

---

## Options Reference

### Core Options

| Flag | Description | Default |
|------|-------------|---------|
| `--name` | Full package name with scope (e.g., `@canonical/my-package`) | Interactive prompt |
| `--type` | Package type: `tool-ts`, `library`, or `css` | Interactive prompt |
| `--description` | Package description for package.json | Empty |

### Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--with-react` | Add React dependencies and JSX config | `false` |
| `--with-storybook` | Add Storybook configuration | `false` |
| `--with-cli` | Add CLI binary entry point | `false` |
| `--run-install` | Run package manager install after creation | `true` |
| `--no-run-install` | Skip the install step | — |

### Global Options

| Flag | Description |
|------|-------------|
| `--dry-run`, `-d` | Preview without writing files |
| `--yes`, `-y` | Skip confirmation prompts |
| `--no-preview` | Skip the file preview step |
| `--help` | Show all options |

---

## Feature Details

### `--with-react`

Adds React as a peer dependency and configures JSX:

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0"
  }
}
```

tsconfig.json:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

### `--with-storybook`

Adds Storybook configuration files:

```
packages/my-lib/
└── .storybook/
    ├── main.ts
    └── preview.ts
```

And adds scripts:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### `--with-cli`

Adds a CLI entry point with bin configuration:

```
packages/my-tool/
└── src/
    ├── index.ts
    └── cli.ts      # CLI entry point
```

package.json:

```json
{
  "bin": {
    "my-tool": "./src/cli.ts"
  }
}
```

The CLI template includes a basic argument parser setup.

---

## Auto-Detection

The generator automatically detects:

### Monorepo Version

When running in the pragma monorepo, the version is read from `lerna.json`:

```json
{
  "version": "0.1.0"
}
```

New packages inherit this version.

### Package Manager

Detects which package manager to use for the install step:

1. If `bun.lockb` or `bun.lock` exists → `bun install`
2. If `pnpm-lock.yaml` exists → `pnpm install`
3. If `yarn.lock` exists → `yarn install`
4. Otherwise → `npm install`

---

## Examples

### TypeScript Tool with CLI

```bash
summon package \
  --name=@canonical/code-checker \
  --type=tool-ts \
  --with-cli \
  --description="Code quality checker"
```

### React Component Library

```bash
summon package \
  --name=@canonical/ui-components \
  --type=library \
  --with-react \
  --with-storybook \
  --description="Shared UI components"
```

### CSS Design Tokens

```bash
summon package \
  --name=@canonical/design-tokens \
  --type=css \
  --description="Design system tokens"
```

### Skip Install (CI/Scripts)

```bash
summon package \
  --name=@canonical/my-pkg \
  --type=library \
  --no-run-install \
  --yes
```

---

## Generated Configuration

### tsconfig.json

Extends the workspace TypeScript config:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

For `tool-ts` packages, `outDir` is omitted (no build step).

### biome.json

Extends the workspace Biome config:

```json
{
  "extends": ["../../biome.json"]
}
```

### Package Scripts

Standard scripts across all package types:

```json
{
  "scripts": {
    "check": "biome check .",
    "check:fix": "biome check --write ."
  }
}
```

Library packages add:

```json
{
  "scripts": {
    "build": "tsc"
  }
}
```

---

## Customization

### Override with Local Generator

Create a local generator to customize behavior:

```
your-project/
└── generators/
    └── package/
        └── index.ts    # Your custom package generator
```

### Extend the Base Generator

```typescript
import { generators } from "@canonical/summon-package";
import { sequence_ } from "@canonical/summon";

const baseGenerator = generators["package"];

export const generator = {
  ...baseGenerator,

  prompts: [
    ...baseGenerator.prompts,
    {
      name: "withGraphQL",
      type: "confirm",
      message: "Include GraphQL setup?",
      default: false,
    },
  ],

  generate: (answers) => sequence_([
    baseGenerator.generate(answers),
    // Add GraphQL config if requested
    answers.withGraphQL && addGraphQLSetup(answers),
  ].filter(Boolean)),
};
```

---

## Troubleshooting

### "Package name must be scoped"

The generator expects scoped package names:

```bash
# Good
summon package --name=@canonical/my-tool

# Bad
summon package --name=my-tool
```

### Install fails

If the install step fails, you can skip it and run manually:

```bash
summon package --name=@canonical/my-tool --no-run-install
cd packages/my-tool
bun install
```

### TypeScript errors after creation

Ensure the workspace TypeScript config exists at `../../tsconfig.json` from the package location. The generated config extends it.

---

## Post-Creation Steps

After generating a package:

1. **Update workspace config** — If using Lerna or workspaces, verify the new package is included
2. **Run install** — If you used `--no-run-install`, run your package manager
3. **Start coding** — Edit `src/index.ts` to add your implementation
4. **Add to CI** — Ensure the new package is included in your CI pipeline

---

## Related

- **[@canonical/summon](../summon/)** — The generator framework (required peer dependency)
- **[@canonical/summon-component](../summon-component/)** — Component scaffolding

## License

GPL-3.0
