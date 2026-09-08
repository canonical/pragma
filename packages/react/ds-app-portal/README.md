# @canonical/react-ds-app-portal

Portal-specific components for the Pragma design system. This package provides specialized UI elements for the Portal application tier.

## Prerequisites

- React 19 or higher

## Installation

```bash
bun add @canonical/react-ds-app-portal
```

The package builds on top of `@canonical/react-ds-global`.

`@canonical/styles` comes with it as a dependency, but installing is not importing. Import it once, in your application's entry point:

```ts
import "@canonical/styles";
```

or, from a stylesheet:

```css
@import url("@canonical/styles");
```

Then mark your root — `<html class="ds app comfortable">` — as the [`@canonical/styles` README](../../styles/main/README.md) describes. That one import is also what puts this package's stylesheets in a defined order against the rest of the design system's: see [Styling](#styling) below.

## Usage

```tsx
import { Button } from "@canonical/react-ds-app-portal";

function AppHeader() {
  return (
    <header>
      <Button>Settings</Button>
    </header>
  );
}
```

## Styling

Each component module imports its own stylesheet (`import "./styles.css"`), so importing a component is what puts its CSS on the page. A component you never import ships no CSS.

Every stylesheet under `src/lib` is wrapped in the `ds.components.apps-portal` cascade layer, named for Portal's own sub-tier in the design system. It sits above `ds.components.global`, so where this package restyles a component a global package also styles, this package wins by layer rather than by whichever bundle the loader emitted last. The CSS entry, `src/lib/index.css`, opens with the statement that places the layer, and that statement has to stay its first rule.

A new stylesheet opens with the same `@layer ds.components.apps-portal { … }` wrapper. `@property` and `@font-face` registrations stay above the block, because no layer sorts a registration, and so does an `@import`, which is only valid before other rules. An application's own unlayered CSS beats every rule in this package whatever the selectors, which is the deliberate escape hatch.

The [`@canonical/styles` README](../../styles/main/README.md) has the full layer order, and [the cascade contract](../../../docs/explanations/STYLES_CASCADE.md) explains why it is shaped this way.

## Storybook

```bash
cd packages/react/ds-app-portal
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
