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

Then mark your root — `<html class="ds app comfortable">` — as the [`@canonical/styles` README](../../styles/main/README.md) describes. That one import is also what puts this package's stylesheets in a defined order against the rest of the design system's: see [Every component stylesheet is in `ds.components.app`](#every-component-stylesheet-is-in-dscomponentsapp) below.

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

### Every component stylesheet is in `ds.components.app`

Every component stylesheet under `src/lib` is wrapped in one cascade layer:

```css
@layer ds.components.app {
  .ds.markdown-editor {
    /* … */
  }
}
```

`.storybook/styles.css` is deliberately not wrapped: it is the Storybook harness rather than a component stylesheet, it is not published, and it carries no component rules.

`@canonical/styles` fixes the order of every layer in one statement, and that statement names both component tiers: `ds.components.global` for the global component packages, then `ds.components.app` for the application tiers, this package among them. Three things follow.

`@canonical/react-ds-global` is not wrapped yet — at the time of writing its stylesheets carry no layer at all — so today it still beats this package for the opposite reason: unlayered beats layered, whatever the emit order. What the layer guarantees, once that package lands, is that a rule here beats the global tier's rule for the same component by cascade layer instead of by whichever bundle a loader emitted last. Nothing in this package restyles a global component today — its class names and the global tier's do not overlap — so the layer is what makes it safe when one does.

The guarantee needs `@canonical/styles` on the page, and needs its statement first. An order statement is what fixes the relative order of two sublayers; without it they fall back to the order they first appear in, and a bundle that emits this package before `@canonical/react-ds-global` hands the win back to the global tier. Nothing under `src/lib` imports `@canonical/styles` — an application imports it once, as the installation instructions above say.

An application's own **unlayered** CSS now beats every rule in this package, whatever the selectors on either side, because an unlayered author rule outranks every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a component writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every component stylesheet under `src/lib` opens with that wrapper, and `src/lib/styles.layer.tests.ts` fails if one does not. `@keyframes` and a component's own `:root` token defaults go inside it; `@property` and `@font-face` registrations stay outside, above the block, because no layer sorts a registration. Never reach for `!important` to win a fight — an important declaration inverts the layer order, so it cannot be arbitrated by layers at all. The "Cascade Layers" section of the `@canonical/styles` README is the reference for the full order and for what is deliberately left unlayered.

One stylesheet here is a vendor theme rather than component styles: `GitDiffViewer/common/CodeDiffViewer/HighlighTheme.css` colours highlight.js's own `.hljs` classes, which no component in this package writes. It belongs in this layer, because it is shipped and imported by the two components that use it and anything else would let it outrank them; but its selectors carry no `.ds` compound, so they match those classes anywhere on a consumer's page. Scoping them to the components that load them is carried to the component-hygiene change.

## Storybook

```bash
cd packages/react/ds-app-launchpad
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
