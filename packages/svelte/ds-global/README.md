# @canonical/svelte-ds-global

Global Svelte components for the Pragma design system. This package provides foundational UI elements for Canonical web applications.

## Prerequisites

- Svelte 5 or higher

## Installation

```bash
bun add @canonical/svelte-ds-global
```

The package depends on `@canonical/styles` for CSS.

## Usage

Import components by name:

```svelte
<script lang="ts">
	import { Example } from "@canonical/svelte-ds-global";
</script>

<Example class="my-example">Hello</Example>
```

Components accept standard HTML attributes for their underlying elements. For example, `Example` accepts the attributes of a native `div` element.

## Styles

Import the main styles package in your application entry point:

```tsx
import "@canonical/styles";
```

`@canonical/styles` provides the global design tokens (colour, spacing, typography). Each component in this package co-locates its own component-level tokens in a `styles.css` file next to the component source. These component tokens reference the global tokens from `@canonical/design-tokens` and are included automatically when the component is imported.

## Development

```bash
# Run checks
bun run check

# Run tests
bun run test
```

### Testing

Tests run with Vitest and include:

- Client tests in `jsdom`
- SSR tests in a Node environment

Use watch mode during development:

```bash
bun run test:vitest:watch
```

## Storybook

Each component includes Storybook stories demonstrating usage patterns and variants:

```bash
cd packages/svelte/ds-global
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
