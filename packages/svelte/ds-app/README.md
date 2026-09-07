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

### Every component stylesheet is in `ds.components.apps`

Every component stylesheet under `src/lib` is wrapped in one cascade layer:

```css
@layer ds.components.apps {
  .ds.application-layout {
    /* … */
  }
}
```

`.storybook/styles.css` is deliberately not wrapped: it is the Storybook harness rather than a component stylesheet, it is not published, and it carries no component rules.

The component layers follow the design system's tier tree, flat, one name per tier: `ds.components.global` for the global packages, then the second level — `sites`, `documentation`, `stores` and `apps` — which `@canonical/styles` names in its order statement, and then a sub-tier, which names itself. This package is the **shared application tier**, so it is `ds.components.apps`. A product's own package (`@canonical/svelte-ds-app-wpe`, `@canonical/svelte-ds-app-launchpad`) is a sub-tier: it declares `@layer ds.components.apps-workplaceengineering;` as the first rule of its stylesheet entry and wraps its sheets in that, and because pragma's statement comes first, a name it does not contain is appended after the second level and sorts above it. Deeper wins, which is the tree's own rule — so a product tier overrides this package, this package overrides the global one, and none of it depends on the order a bundler emits them in. Three things follow.

**This release lands with, and after, the global tier's own wrap** (`@canonical/react-ds-global` and `@canonical/svelte-ds-global`, canonical/pragma#1123 and #1126). Taken alone, wrapping an application tier while its global tier is still unlayered inverts the two: an unlayered author rule outranks every layered one, so the global tier would win every rule the two contend. This package is measurably unaffected either way — 0 of 97 elements move across its 7 Storybook stories, with the global tier layered or not, because the four Svelte global sheets share no selector with it — but the two land together for the same reason the React tiers do.

No selector this package declares is also declared by `@canonical/svelte-ds-global`, so nothing changes hands on installing this release. What the layer buys is the answer to the next collision, and that answer is now fixed rather than emitted: where both tiers style the same component at the same specificity, whichever bundle a loader emitted last used to decide, and this package now wins by cascade layer, whatever the emit order and without a longer selector or an `!important`.

The guarantee needs `@canonical/styles` on the page, and needs its statement first. An order statement is what fixes the relative order of two sublayers; without it they fall back to the order they first appear in, and a bundle that emits this package before `@canonical/svelte-ds-global` hands the win back to the global tier. One nuance, measured: `ds.components.apps` is not a name the statement contains yet — it still names the retired `ds.components.app`, and gains the second level in full with the rework of the styles package — but a sublayer the statement does not name is appended after every name it fixed, so with the statement on the page this package already beats `@canonical/svelte-ds-global` in both emit orders. Nothing under `src/lib` imports `@canonical/styles` — an application imports it once, as the section above says.

An application's own **unlayered** CSS now beats every rule in this package, whatever the selectors on either side, because an unlayered author rule outranks every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a component writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every component stylesheet under `src/lib` opens with that wrapper. `@keyframes` and a component's own `:root` token defaults go inside it; `@property` and `@font-face` registrations stay outside, above the block, because no layer sorts a registration. Never reach for `!important` to win a fight — an important declaration inverts the layer order, so it cannot be arbitrated by layers at all. The "Cascade Layers" section of the `@canonical/styles` README is the reference for the full order and for what is deliberately left unlayered.

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
