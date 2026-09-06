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

### Every component stylesheet is in `ds.components.apps`

Every component stylesheet under `src` is wrapped in one cascade layer:

```css
@layer ds.components.apps {
  .ds.side-navigation {
    /* … */
  }
}
```

That includes the story-only components under `src/storybook`, which carry `.ds` rules of their own and render in the same page as the published ones. `.storybook/styles.css` is deliberately not wrapped: it is the Storybook harness rather than a component stylesheet, and it is not published.

One consequence is worth knowing before you read a story or a screenshot. The harness re-declares two SideNavigation row-grid custom properties, `--sidenav-start` and `--sidenav-row-columns`, because the subcomponent stories (Header, Item, NavTree, …) render inside a bare `.ds.side-navigation` shell without mounting the root, so the component's own sheet is not in those stories' chunk at all and the row grid would collapse without them — removing them moves 14 of the 26 stories. Where both are on the page, the harness copy is now the **authority** rather than merely the last one in: it is unlayered and the component's sheet is in `ds.components.apps`. The values are identical, so nothing computes differently, but the two must be kept in step until the story shell imports the component's sheet, after which the harness copy can go.

The component layers follow the design system's tier tree, flat, one name per tier: `ds.components.global` for the global packages, then the second level — `sites`, `documentation`, `stores` and `apps` — which `@canonical/styles` names in its order statement, and then a sub-tier, which names itself. This package is the **shared application tier**, so it is `ds.components.apps`. A product's own package (`@canonical/react-ds-app-lxd` and its siblings) is a sub-tier: it declares `@layer ds.components.apps-lxd;` as the first rule of its stylesheet entry and wraps its sheets in that, and because pragma's statement comes first, a name it does not contain is appended after the second level and sorts above it. Deeper wins, which is the tree's own rule — so a product tier overrides this package, this package overrides the global one, and none of it depends on the order a bundler emits them in. Three things follow.

**This release lands with, and after, the global tier's own wrap.** Taken alone it would invert the two packages: an unlayered author rule outranks every layered one, so wrapping this package while `@canonical/react-ds-global` is still unlayered hands the global tier every rule the two contend. Measured over this package's 26 Storybook stories, that is 80 of 810 elements — 74 icons in the side navigation lose `vertical-align: sub` to the global Icon's `middle`, and the application shell gains a third grid track from the global package's work-in-progress grid `ApplicationLayout`, which styles `.application-layout`, the same class this package's `ApplicationLayout` renders. With both packages layered, nothing moves at all: 0 of 810 elements, in every condition measured.

Once both are layered, no selector this package declares is also declared by `@canonical/react-ds-global`, so nothing changes hands. What the layer buys is the answer to the next collision, and that answer is fixed rather than emitted: today specificity settles the `.application-layout` near-miss, one seat apart; a global rule written at the same seat as this package's would have been settled by whichever bundle a loader emitted last, and is now settled by layer, in this package's favour, whatever the emit order and without a longer selector or an `!important`.

The guarantee needs `@canonical/styles` on the page, and needs its statement first. An order statement is what fixes the relative order of two sublayers; without it they fall back to the order they first appear in, and a bundle that emits this package before `@canonical/react-ds-global` hands the win back to the global tier. One nuance, measured: `ds.components.apps` is not a name the statement contains yet — it still names the retired `ds.components.app`, and gains the second level in full with the rework of the styles package — but a sublayer the statement does not name is appended after every name it fixed, so with the statement on the page this package already beats `@canonical/react-ds-global` in both emit orders. Nothing under `src/lib` imports `@canonical/styles` — an application imports it once, as the installation instructions above say.

An application's own **unlayered** CSS now beats every rule in this package, whatever the selectors on either side, because an unlayered author rule outranks every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a component writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every component stylesheet under `src` opens with that wrapper, and `src/styles.layer.tests.ts` fails if one does not. `@keyframes` and a component's own `:root` token defaults go inside it; `@property` and `@font-face` registrations stay outside, above the block, because no layer sorts a registration. Never reach for `!important` to win a fight — an important declaration inverts the layer order, so it cannot be arbitrated by layers at all. The "Cascade Layers" section of the `@canonical/styles` README is the reference for the full order and for what is deliberately left unlayered.

## Storybook

```bash
cd packages/react/ds-app
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
