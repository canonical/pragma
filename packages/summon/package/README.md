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

# With a UI framework (library packages)
summon package --name=@canonical/my-lib --type=library --framework=react

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
├── package.json      # type: module, module: src/index.ts
├── tsconfig.json     # extends @canonical/typescript-config
├── biome.json        # extends @canonical/biome-config
├── vitest.config.ts
├── README.md
└── src/
    ├── index.ts      # export entry point
    └── index.test.ts # the sample test, so `bun run test` passes
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
├── package.json         # type: module, main: dist/esm/index.js
├── tsconfig.json        # extends @canonical/typescript-config
├── tsconfig.build.json  # emit: dist/esm (JS) + dist/types (declarations)
├── biome.json
├── vitest.config.ts
├── README.md
└── src/
    ├── index.ts
    └── index.test.ts
```

`--framework=react` and `--framework=svelte` change this layout — see
[`--framework`](#--framework).

Example package.json:

```json
{
  "name": "@canonical/my-lib",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/esm/index.js",
  "module": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js"
    }
  },
  "license": "LGPL-3.0",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "check": "biome check .",
    "check:fix": "biome check --write ."
  },
  "files": ["dist"]
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
| `--framework` | UI framework for a `library`: `none`, `react` or `svelte` | `none` |
| `--with-storybook` | Add Storybook configuration | `false` |
| `--with-cli` | Add CLI binary entry point | `false` |
| `--with-pr-template` | Add a `.github/PULL_REQUEST_TEMPLATE.md` | `false` |
| `--no-run-install` | Skip the install step (install runs by default) | — |

### Global Options

| Flag | Description |
|------|-------------|
| `--dry-run`, `-d` | Preview without writing files |
| `--yes`, `-y` | Skip confirmation prompts |
| `--no-preview` | Skip the file preview step |
| `--help` | Show all options |

---

## Feature Details

### `--framework`

A `library` can target a UI framework. The three values are peers — each one
generates a package that installs, checks, builds and tests on its own.

| Value | Build | Type check | Tests | Ruleset |
|-------|-------|------------|-------|---------|
| `none` | `tsc -p tsconfig.build.json` → `dist/esm` + `dist/types` | `tsc --noEmit` | `vitest run` | `library` |
| `react` | `tsc -p tsconfig.build.json` → `dist/esm` + `dist/types` | `tsc --noEmit` | `vitest run` (jsdom) | `package-react` |
| `svelte` | `svelte-package` → a flat `dist/` | `svelte-check` | three Vitest projects | `package-svelte` |

**`react`** adds React and React DOM as dependencies, `@types/react*` and
`@canonical/typescript-config-react` as devDependencies, and scaffolds a
sample `Example` component with a jsdom test.

**`svelte`** targets [`@sveltejs/package`](https://svelte.dev/docs/kit/packaging)
— a component library, not a SvelteKit app. It emits `svelte.config.js`, a
`vite.config.ts` declaring the `client` / `ssr` / `server` Vitest projects, an
`exports` map carrying the `types`/`import`/`svelte` conditions the
`package-svelte` ruleset enforces, and a sample `Example` component with an SSR
test, a client (real-browser) test, and a plain module test.

`bun run test` runs the `ssr` and `server` projects. The `client` project drives
a real browser through Playwright, so it is opt-in — run
`bunx playwright install` once, then `bun run test:client`.

**Coercions.** A framework applies to `library` packages only, and `svelte`
cannot carry a CLI entry point (`svelte-package` emits a component tree, not an
executable). Either combination is coerced with a warning rather than rejected:

```bash
# warns, then generates a plain tool-ts package
summon package --name=@canonical/my-tool --type=tool-ts --framework=react

# warns, then generates a svelte library with no bin entry
summon package --name=@canonical/my-ui --type=library --framework=svelte --with-cli
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

The generator walks up from the current directory to the nearest monorepo
root — a `lerna.json`, a `pnpm-workspace.yaml`, or a `package.json` with a
`workspaces` field — and reads the version from it (for pnpm workspaces, from
the adjacent `package.json`). A malformed `lerna.json` is treated as "not a
monorepo" instead of aborting the run. In the pragma monorepo that means
`lerna.json`:

```json
{
  "version": "0.1.0"
}
```

New packages inherit this version.

### Package Manager

Detects which package manager to use for the install step by walking up from
the current directory: the nearest directory holding a lockfile wins, and
within a directory the priority is:

1. `bun.lockb` / `bun.lock` → `bun install`
2. `pnpm-lock.yaml` → `pnpm install`
3. `yarn.lock` → `yarn install`
4. `package-lock.json` → `npm install`

With no lockfile anywhere, the fallback is `bun install`.

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
  --framework=react \
  --with-storybook \
  --description="Shared UI components"
```

### Svelte Component Library

```bash
summon package \
  --name=@canonical/svelte-ui-components \
  --type=library \
  --framework=svelte \
  --with-storybook \
  --description="Shared Svelte UI components"
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

- **[@canonical/summon-core](../core/)** — The generator framework (required peer dependency)
- **[@canonical/summon-component](../component/)** — Component scaffolding

## License

GPL-3.0
