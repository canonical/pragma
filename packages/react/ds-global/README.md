# @canonical/react-ds-global

Universal React components for the Pragma design system. This package provides foundational UI elements that apply across all Canonical web applications: buttons, badges, cards, tooltips, and more.

## Prerequisites

- React 19 or higher

## Installation

```bash
bun add @canonical/react-ds-global
```

The package depends on `@canonical/styles` for CSS.

## Usage

Import components by name:

```tsx
import { Button, Badge, Card, Tooltip } from "@canonical/react-ds-global";

function Example() {
  return (
    <Card>
      <Badge>New</Badge>
      <Tooltip content="Click to submit">
        <Button appearance="positive">Submit</Button>
      </Tooltip>
    </Card>
  );
}
```

Components accept standard HTML attributes for their underlying elements. A `Button` accepts all `ButtonHTMLAttributes`, a `Link` accepts all `AnchorHTMLAttributes`, and so on.

## Modifier Families

Several components accept appearance props that correspond to modifier families from `@canonical/ds-types`:

```tsx
<Button appearance="positive">Confirm</Button>
<Button appearance="negative">Delete</Button>
<Button appearance="caution">Proceed with caution</Button>
```

The modifier classes integrate with CSS custom properties defined in `@canonical/styles`.

## Styles

Import the main styles package in your application entry point:

```tsx
import "@canonical/styles";
```

`@canonical/styles` provides the global design tokens (colour, spacing, typography). Each component in this package co-locates its own component-level tokens in a `styles.css` file next to the component source. These component tokens reference the global tokens from `@canonical/design-tokens` and are included automatically when the component is imported.

## Icon assets

Components that render an icon — `Icon`, `Spinner`, and any component with an
icon affordance (e.g. the `Accordion` caret) — reference SVGs from
`@canonical/ds-assets` **at runtime**, not from the JavaScript bundle. Each
glyph is fetched by URL, e.g. `/icons/spinner.svg#spinner`.

Your application must therefore **serve the `@canonical/ds-assets` icons at
`/icons`**. In most setups this means copying (or symlinking) the package's
`icons/` directory into the app's static/public directory so the files are
reachable at `/icons/*.svg`. If the icons are not served, icon-rendering
components mount but appear empty (the SVG `<use>` resolves to nothing).

If you serve the icons from a different path:

- **`Icon` and `Spinner`** accept a `rootPath` prop (default `/icons`) to
  override the location per instance:

  ```tsx
  <Spinner rootPath="/assets/icons" />
  ```

  There is currently no global default — the override is per component
  instance.

- **CSS-referenced icons** (such as the `Accordion` caret) are fixed at
  `/icons` in the stylesheet and cannot be redirected via a prop. Serve the
  icons at `/icons`, or override the relevant component CSS custom property in
  your own styles.

A single global source of truth for the icon root is planned; until then,
serving the assets at `/icons` is the path of least resistance.

## Storybook

Each component includes Storybook stories demonstrating usage patterns and variants:

```bash
cd packages/react/ds-global
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
