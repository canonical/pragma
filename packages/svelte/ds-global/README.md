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

Each component module imports its own stylesheet (`import "./styles.css"`), so importing a component is what puts its CSS on the page. A component you never import ships no CSS, and there is no stylesheet to link by hand.

Every stylesheet here is wrapped in the `ds.components.global` cascade layer, which holds the packages every application gets. It sits below the application tiers, so an application package that restyles one of these components wins by layer rather than by whichever bundle the loader emitted last.

Two things follow for anyone writing CSS here. A new stylesheet opens with the same `@layer ds.components.global { … }` wrapper, and a Svelte `<style>` block needs it too, since Svelte compiles those into document-level CSS. `@property` and `@font-face` registrations stay above the block, because no layer sorts a registration, and so does an `@import`, which is only valid before other rules.

An application's own unlayered CSS beats every rule in this package whatever the selectors on either side. That is the deliberate escape hatch; an application that does not want to win by accident puts its CSS in `@layer app`.

The [`@canonical/styles` README](../../styles/main/README.md) has the full layer order, and [the cascade contract](../../../docs/explanations/STYLES_CASCADE.md) explains why it is shaped this way.

### Components own the box of the natives they render

A component that renders a native element — a `<button>`, an `<input>`, a `<label>` — is responsible for that element's box: its margin, its width, its `min-width`, its `box-sizing`. Anything a component leaves undeclared is filled in by whatever else the host page loads, and on a page that also runs another framework that is a visible bug rather than a default. Declaring the box is being done as its own change; until it lands, treat "the native looks right on our own page" as a weaker guarantee than it sounds.

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

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
