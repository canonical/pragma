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

### How component CSS reaches the page

Each component module imports its own stylesheet (`import "./styles.css"`), so importing a component is what puts its CSS on the page. A bundler collects those imports into the application's CSS; nothing here is injected at runtime, and there is no stylesheet to link by hand. The consequence is that a component you never import ships no CSS — and that the order a bundler happens to emit the sheets in is not something you can rely on, which is what the cascade layer below is for.

### Every stylesheet is in `ds.components.global`

Every `styles.css` in this package is wrapped in one cascade layer:

```css
@layer ds.components.global {
  .ds.my-component {
    /* … */
  }
}
```

`@canonical/styles` declares the order of every layer in one statement, and `ds.components.global` sits near the top of it. Two things follow.

An application tier (`@canonical/svelte-ds-app-launchpad` and its siblings) writes its component CSS into `ds.components.app`, one layer higher. So when an app tier restyles a component this package also styles, the app tier wins by cascade layer — not by which bundle the loader emitted last, which is what decided it before. The same holds against the React global tier (`@canonical/react-ds-global`), which is in this same layer: two global-tier packages that declare the same token now sort by source order inside the layer instead of one of them winning unconditionally.

An application's own **unlayered** CSS now beats every rule in this package, whatever the selectors on either side, because unlayered author rules outrank every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a component writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every stylesheet in this package opens with that wrapper. `@keyframes` and the component's own `:root` token defaults go inside it; `@property` and `@font-face` registrations stay outside, above the block, because no layer sorts a registration. An `@import` stays above the block too — it is only valid before other rules — and takes no `layer()` keyword when the sheet it names carries its own layers. Never reach for `!important` to win a fight — an important declaration inverts the layer order and cannot be arbitrated by layers at all. The `@canonical/styles` README's "Cascade layers" section is the reference for the full order and for what is deliberately left unlayered.

A Svelte `<style>` block inside a `.svelte` file is compiled into document-level CSS — Svelte adds a hash class for scoping, but the rules land in the document cascade like any other sheet — so a `<style>` block that ships needs the same wrapper. No component in this package has one; the styles all live in `styles.css` files.

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
