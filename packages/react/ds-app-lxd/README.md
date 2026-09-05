# @canonical/react-ds-app-lxd

LXD-specific components for the Pragma design system. This package provides specialized UI elements for the LXD application tier.

## Prerequisites

- React 19 or higher
- `@canonical/react-ds-global`, with its Button stylesheet loaded. The Button
  stylesheet in this package is a delta over the global tier’s Button, not a
  standalone component sheet: it declares only what this tier changes, so a
  button rendered without the global tier’s sheet on the page falls back to the
  browser’s own button styling.

## Installation

```bash
bun add @canonical/react-ds-app-lxd
```

The package builds on top of `@canonical/react-ds-global`.

## Usage

```tsx
import { Button } from "@canonical/react-ds-app-lxd";

function AppHeader() {
  return (
    <header>
      <Button>Settings</Button>
    </header>
  );
}
```

## Styling

### Every component stylesheet is in `ds.components.app`

Every component stylesheet under `src/lib` is wrapped in one cascade layer:

```css
@layer ds.components.app {
  .ds.button {
    /* … */
  }
}
```

`.storybook/styles.css` is deliberately not wrapped: it is the Storybook harness rather than a component stylesheet, it is not published, and it carries no component rules.

`@canonical/styles` fixes the order of every layer in one statement, and that statement names both component tiers: `ds.components.global` for the global component packages, then `ds.components.app` for the application tiers, this package among them. Three things follow.

`@canonical/react-ds-global` is not wrapped yet — at the time of writing its stylesheets carry no layer at all — so today it still beats this package for the opposite reason: unlayered beats layered, whatever the emit order. What the layer guarantees, once that package lands, is that this package's `.ds.button` beats the `.ds.button` in `@canonical/react-ds-global` by cascade layer instead of by whichever bundle a loader emitted last. Where the two rules have the same selector at the same specificity, the emit order used to decide; where the global tier reaches for a longer selector, as its density seat does at (0,3,0) against (0,2,0), specificity did.

The guarantee needs `@canonical/styles` on the page, and needs its statement first. An order statement is what fixes the relative order of two sublayers; without it they fall back to the order they first appear in, and a bundle that emits this package before `@canonical/react-ds-global` hands the win back to the global tier. Nothing under `src/lib` imports `@canonical/styles` — an application imports it once, as the installation instructions above say.

An application's own **unlayered** CSS now beats every rule in this package, whatever the selectors on either side, because an unlayered author rule outranks every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a component writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every component stylesheet under `src/lib` opens with that wrapper, and `src/lib/styles.layer.tests.ts` fails if one does not. `@keyframes` and a component's own `:root` token defaults go inside it; `@property` and `@font-face` registrations stay outside, above the block, because no layer sorts a registration. Never reach for `!important` to win a fight — an important declaration inverts the layer order, so it cannot be arbitrated by layers at all. The "Cascade Layers" section of the `@canonical/styles` README is the reference for the full order and for what is deliberately left unlayered.

## Storybook

```bash
cd packages/react/ds-app-lxd
bun run storybook
```

These previews load `@canonical/styles` and nothing else — not the global tier’s
component stylesheets — so the Button story shows a near-native `<button>`
rather than the composed component. Importing the global tier’s Button
stylesheet here is waiting on canonical/pragma#1123, which puts that sheet in
`ds.components.global` (unlayered today, it would outrank every layered rule),
and canonical/pragma#1122, which adds the aggregate `./index.css` subpath to
import.

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
