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

That is what the aggregate below is for. It carries no layer of its own, and its imports are bare: every sheet it imports already opens its own block, so importing one with `layer(…)` would nest it a level deeper instead of placing it.

### The one file to link

Every component stylesheet the package ships is also listed in a single aggregate:

```css
@import url("@canonical/styles");
@import url("@canonical/react-ds-global/index.css");
```

That is the whole file — one `@import` per component stylesheet, nothing else — and what it buys is presence, not position.

Each component imports its own stylesheet from its module, so without the aggregate a component's rules reach the page only when the JavaScript that renders it does. A lazily-loaded route therefore paints before its components' CSS arrives. Linking the aggregate puts every component rule in the entry stylesheet, present from the first paint, so no route can ever render unstyled.

It does not fix where a rule sits in the built sheet. Both copies reach the build — the aggregate's and the component module's — and a minifier that removes duplicates keeps the **last**, which is the module's. Measured on the reference application: the surviving copy of every component rule sits after the application's own CSS, exactly where it sat without the aggregate; all the aggregate leaves ahead of it are the eleven `@media` / `@starting-style` / `:has()` fragments the minifier cannot collapse (1,033 bytes). Order between a component and the application is not settled here and should not be relied on. With the component stylesheets wrapped in `ds.components.global` — the section below — the cascade arbitrates by layer and source position stops mattering at all.

The list is source, not output: it is written by hand, as the repository's constitution asks (an explicit import over a build step that discovers files by naming convention), and `src/lib/index.css.test.ts` fails the build if it stops matching the stylesheets on disk. **Adding a component means adding its line**, alphabetically, in `src/lib/index.css`.

The bytes are already in the bundle either way: the package declares no `sideEffects`, so a bundler that reaches the barrel pulls all 46 sheets in regardless. On the reference build the aggregate adds 1,033 bytes to the minified stylesheet — the residue the duplicate removal leaves — and roughly 96 KB to a build that does not remove duplicates.

The published paths are `@canonical/react-ds-global/index.css` (the subpath the `exports` map names) and `dist/esm/lib/index.css` (the file itself). The manifest also carries it as `style`, which some tools read to find a package's stylesheet without an import — the same field `@canonical/react-ds-global-form` uses for its own.

### What the package publishes, and how to import it

The manifest now carries an `exports` map, which is the list of paths this package answers to:

| Specifier | What it gives you |
| --- | --- |
| `@canonical/react-ds-global` | the components |
| `@canonical/react-ds-global/index.css` | the aggregate stylesheet above |
| `@canonical/react-ds-global/dist/…` | any published file, by its exact path |
| `@canonical/react-ds-global/package.json` | the manifest |

**This is a breaking change for anyone importing by a path the map does not answer.** Before, a package with no `exports` map let a resolver reach any file in the directory and, in most bundlers, guess at the rest — the extension you left off, or the `index.js` inside a folder you named. Two things stop working:

- **A folder instead of a file.** `@canonical/react-ds-global/dist/esm` and `@canonical/react-ds-global/dist/esm/lib/component/Button` used to find the `index.js` inside them. Name the file: `…/dist/esm/index.js`, `…/dist/esm/lib/component/Button/index.js`.
- **Anything outside `dist`.** `@canonical/react-ds-global/README.md`, or any `src/…` path that happened to resolve in a workspace checkout, now fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Those files are not published anyway; `files` has only ever listed `dist`.

Leaving the extension off a real file (`…/Button/Button`) still works in the resolvers we tested, but it depends on the resolver rather than on this package — write the extension.

Importing the package by name, or the stylesheet by its subpath, is unaffected, and that is what nearly every consumer does.
### Every component stylesheet is in `ds.components.global`

Every component `styles.css` in this package is wrapped in one cascade layer:

```css
@layer ds.components.global {
  .ds.my-component {
    /* … */
  }
}
```

`@canonical/styles` declares the order of every layer in one statement, and `ds.components.global` sits near the top of it. Two things follow.

Above it are the other component tiers, which follow the design system's own tier tree, flat: `ds.components.sites`, `ds.components.documentation`, `ds.components.stores` and `ds.components.apps`, and above each of those a sub-tier layer for one product's own components — `ds.components.apps-lxd`, which that package declares itself, first rule in its CSS entry, because the styles package's order statement cannot know a product's name. Flat rather than nested: a nested `ds.components.apps.lxd` would sort *inside* `ds.components.apps` and so lose to every rule written directly there, the opposite of what a product tier needs.

None of those packages is wrapped yet — at the time of writing no stylesheet under `packages/react/ds-app*` or `packages/svelte/ds-app*` carries a layer at all — and wrapping them is being done package by package alongside this one. So today a product tier still beats this package for the opposite reason: it is unlayered, and unlayered beats layered. What the layers guarantee, once those packages land, is that a product tier's rule for a component this package also styles wins by cascade layer rather than by whichever bundle the loader emitted last.

An application's own **unlayered** CSS now beats every rule in this package, whatever the selectors on either side, because unlayered author rules outrank every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a component writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every component `styles.css` in this package opens with that wrapper. `@keyframes` and the component's own `:root` token defaults go inside it; `@property` and `@font-face` registrations stay outside, above the block. That is a convention, not something the cascade forces: a layer does sort a registration — a higher layer's `@property` or `@keyframes` beats a lower layer's in either source order, and an unlayered one beats both (measured in Chromium 151). Keeping the registrations above the block is what makes them read as what they are, declarations the whole document shares, and puts them where a reader goes to look them up. `@keyframes` going inside the block is the opposite choice, and deliberate: it lets an application tier replace an animation by layer. A sheet this package ships is imported **bare**, never with `layer(ds.components.global)`: it already opens its own block, and the keyword would nest it one level deeper, at `ds.components.global.ds.components.global` — a sublayer that loses to this layer's own rules at any specificity (measured in Chromium 151). `layer(…)` on an import is for a sheet that carries no layer of its own. Never reach for `!important` to win a fight — an important declaration inverts the layer order and cannot be arbitrated by layers at all. The package ships exactly one, `component/Tooltip/styles.css:16`, which strips the margin off whatever a tooltip is attached to; it is a known defect and the component-hygiene change removes it. The `@canonical/styles` README's "Cascade layers" section is the reference for the full order and for what is deliberately left unlayered.

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
