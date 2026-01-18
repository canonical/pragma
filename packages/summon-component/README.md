# @canonical/summon-component

Component generators for [Summon](../summon) - React and Svelte component scaffolding.

## Installation

```bash
bun add @canonical/summon-component
```

Requires `@canonical/summon` as a peer dependency.

## Usage

Once installed, generators are automatically discovered by Summon:

```bash
# List available component generators
summon component

# Generate a React component
summon component react

# Generate a Svelte component
summon component svelte

# See all options
summon component react --help
```

## Generators

### `summon component react`

Generate a React component with TypeScript, tests, stories, and styles.

```bash
# Zero-config (uses all defaults)
summon component react

# Specify component path
summon component react --component-path=src/components/Button

# Minimal component (no SSR tests)
summon component react --no-with-ssr-tests

# Preview without writing files
summon component react --dry-run
```

**CLI Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--component-path` | Component path (e.g., src/components/Button) | `src/components/MyComponent` |
| `--no-with-styles` | Exclude styles.css | styles included |
| `--no-with-stories` | Exclude Storybook stories | stories included |
| `--no-with-ssr-tests` | Exclude SSR tests | SSR tests included |
| `--dry-run` | Preview without writing files | - |
| `--yes` | Skip confirmation prompts | - |

**Generated files:**
```
src/components/Button/
├── Button.tsx           # Main component
├── Button.test.tsx      # Unit tests
├── Button.ssr.test.tsx  # SSR tests (optional)
├── Button.stories.tsx   # Storybook stories (optional)
├── index.ts             # Exports
├── types.ts             # TypeScript types
└── styles.css           # Styles (optional)
```

### `summon component svelte`

Generate a Svelte 5 component with TypeScript, tests, and stories.

```bash
# Zero-config (uses all defaults)
summon component svelte

# Specify component path
summon component svelte --component-path=src/lib/components/Button

# With TypeScript stories (instead of Svelte CSF)
summon component svelte --use-ts-stories

# Minimal component
summon component svelte --no-with-styles --no-with-stories

# Preview without writing files
summon component svelte --dry-run
```

**CLI Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--component-path` | Component path (e.g., src/lib/components/Button) | `src/lib/components/MyComponent` |
| `--no-with-styles` | Exclude `<style>` block | styles included |
| `--no-with-stories` | Exclude Storybook stories | stories included |
| `--use-ts-stories` | Use TypeScript stories format | Svelte CSF |
| `--no-with-ssr-tests` | Exclude SSR tests | SSR tests included |
| `--dry-run` | Preview without writing files | - |
| `--yes` | Skip confirmation prompts | - |

**Generated files:**
```
src/lib/components/Button/
├── Button.svelte          # Main component
├── Button.svelte.test.ts  # Unit tests
├── Button.ssr.test.ts     # SSR tests (optional)
├── Button.stories.svelte  # Storybook stories (optional, Svelte CSF)
├── Button.stories.ts      # Storybook stories (optional, TypeScript)
├── index.ts               # Exports
└── types.ts               # TypeScript types
```

## Package Structure

```
src/
├── index.ts    # Barrel exporting all generators
├── react/      # React component generator
│   └── index.ts
└── svelte/     # Svelte component generator
    └── index.ts
```

## License

GPL-3.0
