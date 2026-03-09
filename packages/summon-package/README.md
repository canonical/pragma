# @canonical/summon-package

Package scaffolding for the pragma monorepo. Generates new npm packages with proper TypeScript configuration, linting, and workspace integration.

## Installation

```bash
bun add @canonical/summon-package
```

Requires `@canonical/summon` as a peer dependency:

```bash
bun add @canonical/summon
```

## Quick Start

```bash
# Interactive — decision-tree prompts guide you
summon package

# Direct — specify answers as flags
summon package --name=@canonical/my-lib --content=typescript

# Preview without writing files
summon package --name=@canonical/my-lib --content=typescript --dry-run
```

## Decision Tree

The generator uses a decision-tree prompt flow rather than flat feature flags.
Each prompt narrows the package archetype, and downstream options only appear
when they are relevant.

```
content?
├── [1] css
│   CSS-only package (tokens, utilities)
│   License: LGPL-3.0 | Entry: src/index.css | No build
│
└── [2] typescript
    └── framework?
        ├── [2.1] react
        │   └── isComponentLibrary?
        │       │
        │       ├── [2.1.1] yes — React component library
        │       │   License: LGPL-3.0 | Entry: dist/esm/index.js
        │       │   Build: tsc | Storybook: yes
        │       │
        │       └── [2.1.2] no
        │           └── withCli?
        │               │
        │               ├── [2.1.2.1] yes — React CLI tool
        │               │   License: GPL-3.0 | Entry: src/index.ts
        │               │   No build | CLI: src/cli.ts
        │               │
        │               └── [2.1.2.2] no — React hooks/utils library
        │                   License: LGPL-3.0 | Entry: dist/esm/index.js
        │                   Build: tsc
        │
        └── [2.2] none
            └── withCli?
                │
                ├── [2.2.1] yes — TypeScript CLI tool
                │   License: GPL-3.0 | Entry: src/index.ts
                │   No build | CLI: src/cli.ts
                │
                └── [2.2.2] no — Plain TypeScript library
                    License: LGPL-3.0 | Entry: dist/esm/index.js
                    Build: tsc
```

### Decision Rationale

Each branch point resolves a design question:

| Prompt | Why it matters |
|--------|---------------|
| **content** | CSS packages have no TypeScript, no build, and minimal tooling. Asking this first eliminates all downstream questions. |
| **framework** | Framework choice determines tsconfig extends, test setup (vitest + jsdom vs vitest alone), and peer dependencies. |
| **isComponentLibrary** | Component libraries get Storybook automatically. Non-component React packages (hooks, utils) skip it. |
| **withCli** | CLI tools run from source (no build step) and use GPL-3.0. Libraries build to `dist/` and use LGPL-3.0. |

### Derived Configuration

The following properties are derived automatically from the tree path
and never prompted:

| Property | Rule |
|----------|------|
| `needsBuild` | `false` for CSS and CLI packages, `true` otherwise |
| `license` | `GPL-3.0` for CLI tools, `LGPL-3.0` otherwise |
| `storybook` | `true` only for component libraries |
| `ruleset` | `base` (CSS), `package-react` (React), `tool-ts` (CLI), `library` (plain TS) |
| `module` | `src/index.css` (CSS), `src/index.ts` (no build), `dist/esm/index.js` (build) |
| `types` | `null` (CSS), `src/index.ts` (no build), `dist/types/index.d.ts` (build) |

## Leaf Examples

### Leaf 1 — CSS package

```bash
summon package --name=@canonical/design-tokens --content=css
```

```
design-tokens/
├── package.json
├── biome.json
├── README.md
└── src/
    └── index.css
```

### Leaf 2.1.1 — React component library

```bash
summon package \
  --name=@canonical/ui-components \
  --content=typescript \
  --framework=react \
  --is-component-library
```

```
ui-components/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── biome.json
├── vite.config.ts
├── vitest.setup.ts
├── README.md
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── styles.css
├── public/
└── src/
    ├── index.ts
    ├── lib/
    └── assets/
```

### Leaf 2.2.1 — TypeScript CLI tool

```bash
summon package \
  --name=@canonical/code-checker \
  --content=typescript \
  --framework=none \
  --with-cli
```

```
code-checker/
├── package.json
├── tsconfig.json
├── biome.json
├── README.md
└── src/
    ├── index.ts
    └── cli.ts
```

### Leaf 2.2.2 — Plain TypeScript library

```bash
summon package \
  --name=@canonical/utils \
  --content=typescript \
  --framework=none \
  --no-with-cli
```

```
utils/
├── package.json
├── tsconfig.json
├── biome.json
├── README.md
└── src/
    └── index.ts
```

## Prompts Reference

| Prompt | Type | Shown when | Default |
|--------|------|-----------|---------|
| `name` | text | always | `@canonical/my-package` |
| `description` | text | always | (empty) |
| `content` | select: `typescript`, `css` | always | `typescript` |
| `framework` | select: `none`, `react` | content = typescript | `none` |
| `isComponentLibrary` | confirm | framework != none | `true` |
| `withCli` | confirm | not a component library | `false` |
| `runInstall` | confirm | always | `true` |

## Auto-Detection

The generator detects environment context automatically:

- **Monorepo version** — reads `lerna.json` (current dir, parent, or grandparent) and uses its version for new packages.
- **Framework version** — React packages follow `@canonical/react-ds-global` versioning when found in the monorepo.
- **Package manager** — checks for `bun.lockb`/`bun.lock`, `yarn.lock`, `pnpm-lock.yaml`. Defaults to bun.

## Extending

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
    answers.withGraphQL && addGraphQLSetup(answers),
  ].filter(Boolean)),
};
```

## License

GPL-3.0
