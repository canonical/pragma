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

### The one file to link

Every component stylesheet the package ships is also listed in a single aggregate:

```css
@import url("@canonical/styles");
@import url("@canonical/react-ds-global/index.css");
```

That is the whole file — one `@import` per component stylesheet, nothing else — and it exists for order, not for content. Because each component imports its own stylesheet from its module, the order in which those stylesheets reach the page follows the JavaScript import graph: a lazily-loaded route brings its components' CSS with it, arriving after the application's own stylesheet and winning ties it should lose. Importing the aggregate once, immediately after `@canonical/styles` and before anything the application writes, puts every component rule on the page in a fixed position.

Link it in the same stylesheet that imports `@canonical/styles`, so a bundler resolves both together and neither can be reordered by a code-splitting decision. The components still import their own CSS, so an application that does not link the aggregate loses nothing but the guarantee.

The list is source, not output: it is written by hand, as the repository's constitution asks (an explicit import over a build step that discovers files by naming convention), and `src/lib/index.css.test.ts` fails the build if it stops matching the stylesheets on disk. **Adding a component means adding its line**, alphabetically, in `src/lib/index.css`.

The published paths are `@canonical/react-ds-global/index.css` (the subpath) and `dist/esm/lib/index.css` (the file the `style` field names).

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
