# @canonical/svelte-ds-global

Global Svelte components for the Pragma design system. This package provides foundational UI elements for Canonical web applications.

## Prerequisites

- Svelte 5 or higher

## Installation

```bash
bun add @canonical/svelte-ds-global @canonical/styles
```

Import the design system's styles **first** in your application's entry, before anything that imports a component:

```ts
import "@canonical/styles";
```

Each component brings its own stylesheet when you import it.

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

`@canonical/styles` provides the global design tokens (colour, spacing, typography). Each component in this package co-locates its own component-level tokens in a `styles.css` file next to the component source. These component tokens reference the global tokens from `@canonical/design-tokens` and are included automatically when the component is imported.

## Icon assets

Components that render an icon, such as `Spinner` and the `Button` loading state, reference SVGs from `@canonical/ds-assets` **at runtime**, not from the JavaScript bundle. Each glyph is fetched by URL, for example `/icons/spinner.svg#spinner`.

Your application must therefore **serve the `@canonical/ds-assets` icons at `/icons`**. In most setups this means copying (or symlinking) the package's `icons/` directory into the app's static directory (`static/` in SvelteKit) so the files are reachable at `/icons/*.svg`. If the icons are not served, icon-rendering components mount but appear empty (the SVG `<use>` resolves to nothing).

If you serve the icons from a different path, `Spinner` accepts a `rootPath` prop (default `/icons`) to override the location per instance:

```svelte
<Spinner rootPath="/assets/icons" />
```

There is currently no global default; the override is per component instance. The `Button` loading state renders its Spinner with the default path.

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
cd packages/svelte/ds-global
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/pragma-core/tree/main/packages/semantics/design-system).
