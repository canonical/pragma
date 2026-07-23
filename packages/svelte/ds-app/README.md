# @canonical/svelte-ds-app

App-level Svelte components for the Pragma design system. This package provides UI elements for use across Canonical applications.

## Prerequisites

- Svelte 5 or higher

## Installation

```bash
bun add @canonical/svelte-ds-app
```

The package builds on top of `@canonical/svelte-ds-global` and depends on `@canonical/styles` for CSS.

## Usage

Import components by name:

```svelte
<script lang="ts">
	import { ApplicationLayout, ContentLayout, ViewLayout } from "@canonical/svelte-ds-app";
</script>

<ApplicationLayout>
	{#snippet navigation()}
		<!-- Navigation rail -->
	{/snippet}
	<ViewLayout>
		<ContentLayout>
			<!-- Content items -->
		</ContentLayout>
	</ViewLayout>
</ApplicationLayout>
```

Components accept standard HTML attributes for their underlying elements. For example, `ApplicationLayout` accepts the attributes of a native `div` element.

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

- Client tests in real browsers (Chromium, Firefox, WebKit) via Vitest browser mode and Playwright
- SSR tests in a Node environment

Playwright browsers must be installed once before running client tests:

```bash
bunx playwright install chromium firefox webkit
```

Use watch mode during development:

```bash
bun run test:watch
```

## Storybook

Each component includes Storybook stories demonstrating usage patterns and variants:

```bash
cd packages/svelte/ds-app
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
