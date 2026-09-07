# @canonical/react-ds-app-launchpad

Launchpad-specific components for the Pragma design system. This package provides specialized UI elements for the Launchpad application, including markdown editing, git diff visualization, and file tree navigation.

## Prerequisites

- React 19 or higher

## Installation

```bash
bun add @canonical/react-ds-app-launchpad
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

Then mark your root — `<html class="ds app comfortable">` — as the [`@canonical/styles` README](../../styles/main/README.md) describes. That one import is also what puts this package's stylesheets in a defined order against the rest of the design system's: see [Every component stylesheet is in `ds.components.apps-launchpad`](#every-component-stylesheet-is-in-dscomponentsapps-launchpad) below.

## Usage

```tsx
import { MarkdownEditor, GitDiffViewer, FileTree } from "@canonical/react-ds-app-launchpad";

function CodeReview() {
  return (
    <div>
      <FileTree items={files} />
      <GitDiffViewer diff={diffContent} />
      <MarkdownEditor value={comment} onChange={setComment} />
    </div>
  );
}
```

## Styling

### Every component stylesheet is in `ds.components.apps-launchpad`

Every component stylesheet under `src/lib` is wrapped in one cascade layer:

```css
@layer ds.components.apps-launchpad {
  .ds.markdown-editor {
    /* … */
  }
}
```

The name comes from the tier this package implements. Component layers follow the design system's tier tree, one flat name per tier: `ds.components.global` for the components every application gets, `ds.components.apps` for the ones Canonical applications share, and `ds.components.apps-launchpad` for this package, which specialises them. `@canonical/styles` names the tiers one level up, so a name like this one is appended after them and sorts above the tier it specialises.

`src/lib/index.css` names the layer as its first rule and then imports every component stylesheet:

```css
@layer ds.components.apps-launchpad;

@import url("./MarkdownEditor/styles.css");
```

A layer takes its place in the order the first time its name is seen, so naming it there — before any component sheet can open a block with it — keeps that place the same whichever sheet a bundler emits first. Importing a component already brings its own stylesheet, so that file is for a consumer who wants every component's CSS in one import.

`.storybook/styles.css` is deliberately not wrapped: it is the Storybook harness rather than a component stylesheet, it is not published, and it carries no component rules.

Three things follow.

`@canonical/react-ds-global` and `@canonical/react-ds-app` are not wrapped yet — at the time of writing neither package's stylesheets carry a layer at all — so today they still beat this package for the opposite reason: unlayered beats layered, whatever the emit order. What the layer guarantees, once those packages land, is that a rule here beats their rule for the same component by cascade layer instead of by whichever bundle a loader emitted last. Nothing in this package restyles a component from either of them today — the class names do not overlap — so the layer is what makes it safe when one does.

The order needs `@canonical/styles` on the page, needs its statement first, and needs that statement to name the shared application tier, since this package's name is appended after the names already fixed. Measured in Chromium 151: with the statement as it stands today, a rule here beats the same rule in `ds.components.apps` when the shared package is emitted first and loses when it is emitted second; with the tiers named at the second level, which a change released alongside this one adds, it wins in both orders. Nothing under `src/lib` imports `@canonical/styles` — an application imports it once, as the installation instructions above say.

An application's own **unlayered** CSS now beats every rule in this package, whatever the selectors on either side, because an unlayered author rule outranks every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a component writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every component stylesheet under `src/lib` opens with that wrapper, `src/lib/index.css` names the layer and imports the new sheet. `@keyframes` and a component's own `:root` token defaults go inside the wrapper; `@property` and `@font-face` registrations stay outside, above the block, because no layer sorts a registration. Never reach for `!important` to win a fight — an important declaration inverts the layer order, so it cannot be arbitrated by layers at all. The "Cascade Layers" section of the `@canonical/styles` README is the reference for the full order and for what is deliberately left unlayered.

One stylesheet here is a vendor theme rather than component styles: `GitDiffViewer/common/CodeDiffViewer/HighlighTheme.css` colours highlight.js's own `.hljs` classes, which no component in this package writes. It belongs in this layer, because it is shipped and imported by the two components that use it and anything else would let it outrank them; but its selectors carry no `.ds` compound, so they match those classes anywhere on a consumer's page. Scoping them to the components that load them is carried to the component-hygiene change.

## Storybook

```bash
cd packages/react/ds-app-launchpad
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
