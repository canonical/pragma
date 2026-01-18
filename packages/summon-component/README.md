# @canonical/summon-component

Component generators for [Summon](../summon) - React and Svelte component scaffolding.

## Installation

```bash
# Using bun (recommended)
bun add @canonical/summon-component

# Using npm
npm install @canonical/summon-component
```

Note: Requires `@canonical/summon` as a peer dependency.

## Usage

Once installed, the generators are automatically discovered by Summon:

```bash
# List available component generators
summon component

# Generate a React component
summon component react

# Generate a Svelte component
summon component svelte

# Dry-run to preview files
summon component react --dry-run
```

## Generators

### `summon component react`

Generate a React component with TypeScript, tests, stories, and styles.

**Prompts:**
- Component path (e.g., `src/components/Button`)
- Include styles.css
- Include Storybook stories
- Include SSR tests

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

**Prompts:**
- Component path (e.g., `src/lib/components/Button`)
- Include `<style>` block
- Include Storybook stories
- Use TypeScript stories format (vs Svelte CSF)
- Include SSR tests

**Generated files:**
```
src/lib/components/Button/
├── Button.svelte          # Main component
├── Button.svelte.test.ts  # Unit tests
├── Button.ssr.test.ts     # SSR tests (optional)
├── Button.stories.svelte  # Storybook stories (optional)
├── index.ts               # Exports
└── types.ts               # TypeScript types
```

## Development

```bash
# Run checks
bun run check

# Test with explicit path (from summon package)
cd ../summon
bun run src/cli.tsx --generators ../summon-component/generators component react --dry-run
```

## License

GPL-3.0
