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

### How component CSS reaches the page

Each component module imports its own stylesheet (`import "./styles.css"`), so importing a component is what puts its CSS on the page. A bundler collects those imports into the application's CSS; nothing here is injected at runtime, and there is no stylesheet to link by hand. The consequence is that a component you never import ships no CSS — and that the order a bundler happens to emit the sheets in is not something you can rely on, which is what the cascade layer below is for.

An aggregate `index.css` with one `@import` per sheet — for consumers who want every component's CSS without importing every component — is being added separately and will be documented here when it lands.

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

An application tier (`@canonical/react-ds-app-lxd` and its siblings) writes its component CSS into `ds.components.app`, one layer higher. So when an app tier restyles a component this package also styles, the app tier wins by cascade layer — not by which bundle the loader emitted last, which is what decided it before.

An application's own **unlayered** CSS now beats every rule in this package, whatever the selectors on either side, because unlayered author rules outrank every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a component writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every stylesheet in this package opens with that wrapper. `@keyframes` and the component's own `:root` token defaults go inside it; `@property` and `@font-face` registrations stay outside, above the block, because no layer sorts a registration. Never reach for `!important` to win a fight — an important declaration inverts the layer order and cannot be arbitrated by layers at all. The `@canonical/styles` README's "Cascade layers" section is the reference for the full order and for what is deliberately left unlayered.

### Components own the box of the natives they render

A component that renders a native element — a `<button>`, an `<input>`, a `<label>` — is responsible for that element's box: its margin, its width, its `min-width`, its `box-sizing`. Anything a component leaves undeclared is filled in by whatever else the host page loads, and on a page that also runs another framework that is a visible bug rather than a default. Declaring the box is being done as its own change; until it lands, treat "the native looks right on our own page" as a weaker guarantee than it sounds.

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
