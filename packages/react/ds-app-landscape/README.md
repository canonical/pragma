# @canonical/react-ds-app-landscape

Landscape-specific components for the Pragma design system. This package provides specialized UI elements for the Landscape application tier.

## Prerequisites

- React 19 or higher

## Installation

```bash
bun add @canonical/react-ds-app-landscape
```

The package builds on top of `@canonical/react-ds-global`.

## Usage

```tsx
import { Button } from "@canonical/react-ds-app-landscape";

function AppHeader() {
  return (
    <header>
      <Button>Settings</Button>
    </header>
  );
}
```

## Cascade Layer

Every `styles.css` in this package is wrapped in one cascade layer:

```css
@layer ds.components.app {
  .ds.button {
    /* … */
  }
}
```

`@canonical/styles` fixes the order of every layer in one statement, and that statement names both component tiers: `ds.components.global` for the global component packages, then `ds.components.app` for the application tiers, this package among them. Because the app tier is named after the global one, this package's `.ds.button` beats the `.ds.button` in `@canonical/react-ds-global` by layer alone. Which of the two won used to depend on whichever stylesheet a bundler emitted last: the two rules have the same selector at the same specificity, so nothing else could settle it. The app tier now wins whatever the import order, without a longer selector and without `!important`.

An application's own **unlayered** CSS still beats every rule in this package, whatever the selectors on either side, because an unlayered author rule outranks every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a component writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every stylesheet in this package opens with that wrapper. `@keyframes` and a component's own `:root` token defaults go inside it; `@property` and `@font-face` registrations stay outside, above the block, because no layer sorts a registration. Never reach for `!important` to win a fight — an important declaration inverts the layer order, so it cannot be arbitrated by layers at all. The "Cascade Layers" section of the `@canonical/styles` README is the reference for the full order and for what is deliberately left unlayered.

## Storybook

```bash
cd packages/react/ds-app-landscape
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
