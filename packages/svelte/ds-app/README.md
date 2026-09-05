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

### Every component stylesheet is in `ds.components.app`

Every component stylesheet under `src/lib` is wrapped in one cascade layer:

```css
@layer ds.components.app {
  .ds.application-layout {
    /* … */
  }
}
```

`.storybook/styles.css` is deliberately not wrapped: it is the Storybook harness rather than a component stylesheet, it is not published, and its overrides are meant to win.

`@canonical/styles` fixes the order of every layer in one statement, and that statement names both component tiers: `ds.components.global` for the global component packages, then `ds.components.app` for the application tiers, this package among them. Three things follow.

No selector this package declares is also declared by `@canonical/svelte-ds-global` today, so nothing changes hands on installing this release — what the layer buys is the answer to the next collision, and that answer is now fixed rather than emitted. Where both tiers style the same component at the same specificity, whichever bundle a loader emitted last used to decide; this package now wins by cascade layer, whatever the emit order and without a longer selector or an `!important`.

The guarantee needs `@canonical/styles` on the page, and needs its statement first. An order statement is what fixes the relative order of two sublayers; without it they fall back to the order they first appear in, and a bundle that emits this package before `@canonical/svelte-ds-global` hands the win back to the global tier. Nothing under `src/lib` imports `@canonical/styles` — an application imports it once, as the section above says.

An application's own **unlayered** CSS now beats every rule in this package, whatever the selectors on either side, because an unlayered author rule outranks every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a component writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every component stylesheet under `src/lib` opens with that wrapper, and `src/lib/styles.layer.test.ts` fails if one does not. `@keyframes` and a component's own `:root` token defaults go inside it; `@property` and `@font-face` registrations stay outside, above the block, because no layer sorts a registration. Never reach for `!important` to win a fight — an important declaration inverts the layer order, so it cannot be arbitrated by layers at all. The "Cascade Layers" section of the `@canonical/styles` README is the reference for the full order and for what is deliberately left unlayered.

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
