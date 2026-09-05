# @canonical/react-ds-app

Application-level UI components for the Pragma design system. This package provides navigation, toolbars, and layout components suited for internal tools and applications.

## Prerequisites

- React 19 or higher

## Installation

```bash
bun add @canonical/react-ds-app
```

The package builds on top of `@canonical/react-ds-global`.

## Usage

```tsx
import { Button } from "@canonical/react-ds-app";

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

Every component stylesheet under `src` is wrapped in one cascade layer:

```css
@layer ds.components.app {
  .ds.side-navigation {
    /* … */
  }
}
```

That includes the story-only components under `src/storybook`, which carry `.ds` rules of their own and render in the same page as the published ones. `.storybook/styles.css` is deliberately not wrapped: it is the Storybook harness rather than a component stylesheet, it is not published, and its overrides are meant to win.

`@canonical/styles` fixes the order of every layer in one statement, and that statement names both component tiers: `ds.components.global` for the global component packages, then `ds.components.app` for the application tiers, this package among them. Three things follow.

No selector this package declares is also declared by `@canonical/react-ds-global` today, so nothing changes hands on installing this release — what the layer buys is the answer to the next collision, and that answer is now fixed rather than emitted. The nearest miss is already in the tree: the global package's work-in-progress grid `ApplicationLayout` styles `.application-layout`, the same class this package's `ApplicationLayout` renders, one specificity seat lower. Today specificity settles that one; a global rule written at the same seat as this package's would have been settled by whichever bundle a loader emitted last. It is now settled by layer, in this package's favour, whatever the emit order and without a longer selector or an `!important`.

The guarantee needs `@canonical/styles` on the page, and needs its statement first. An order statement is what fixes the relative order of two sublayers; without it they fall back to the order they first appear in, and a bundle that emits this package before `@canonical/react-ds-global` hands the win back to the global tier. Nothing under `src/lib` imports `@canonical/styles` — an application imports it once, as the installation instructions above say.

An application's own **unlayered** CSS now beats every rule in this package, whatever the selectors on either side, because an unlayered author rule outranks every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a component writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every component stylesheet under `src` opens with that wrapper, and `src/styles.layer.tests.ts` fails if one does not. `@keyframes` and a component's own `:root` token defaults go inside it; `@property` and `@font-face` registrations stay outside, above the block, because no layer sorts a registration. Never reach for `!important` to win a fight — an important declaration inverts the layer order, so it cannot be arbitrated by layers at all. The "Cascade Layers" section of the `@canonical/styles` README is the reference for the full order and for what is deliberately left unlayered.

## Storybook

```bash
cd packages/react/ds-app
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
