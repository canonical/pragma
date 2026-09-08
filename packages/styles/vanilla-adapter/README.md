# @canonical/styles-vanilla-adapter

Runs pragma's components inside an application that is still built with Vanilla Framework. The two frameworks style the same page without reaching into each other, so you can migrate a page at a time instead of all at once.

Your existing stylesheet stays. Everything Vanilla moves inside one cascade layer, the order statement from this package goes above it, and pragma's CSS is loaded from a second entry after it. No selector of yours changes, and nothing is rewritten by a build step.

The package ships three stylesheets and depends only on `@canonical/styles`. None of them references a font, an image or an icon, so nothing new is downloaded or copied at build time.

| File | What it does |
| --- | --- |
| `layers.css` | Declares the cascade layer order that both frameworks share. |
| `adapter.css` | Keeps Vanilla out of pragma's components, carries Vanilla's light or dark mode into them, and loads what a mixed page needs from pragma. |
| `elements.css` | Pragma's element styles, confined to pragma's components rather than applied to the whole page. |

The reasoning behind the design is in pragma's cascade explanation, `docs/explanations/STYLES_CASCADE.md`.

## Prerequisites

You need `@canonical/styles` 0.40.0 or later, the release that ships its stylesheet as three entry points: `tokens.css`, `elements.css` and `layout.css`. Earlier releases will not work, because the imports in `adapter.css` do not resolve and there is nothing for the confined copy to be a copy of.

The dependency is a normal one with a caret range, as in the component packages, and it pins the release the copy was taken from. A test compares the copy against that release's source in this repository, so the two cannot drift apart.

This package is released alongside `@canonical/styles`, and its dependency range moves with it, so an install always pairs the confined copy with the release it was taken from.

## Installation

### 1. Add the packages

```bash
bun add @canonical/styles-vanilla-adapter @canonical/ds-assets
```

`@canonical/styles` arrives as a dependency of this package, at the release the confined copy was taken from. A mixed page does not import it directly, because `adapter.css` does that for you. It moves into your own manifest when this package leaves, which is covered under [Removal](#removal).

### 2. Put everything Vanilla inside one layer

In the stylesheet you already have, wrap Vanilla and everything built on it in a single `@layer vanilla { … }` block: the `@import "vanilla-framework"` line itself, your patterns, your overrides, and any third-party CSS you inline. No selector changes, and nothing moves out of the file.

The Vanilla import goes inside the block rather than above it, because Vanilla emits a rule at import time (`hr.is-fixed-width`) that then lands in the layer with everything else. Leave no Vanilla-era rule outside the block.

### 3. Put the order statement above it

The order statement has to be the first rule the browser reads, before any rule it orders. Only `@charset` may come before it.

This is the one step with no safety net. A layer takes its place the first time the browser sees its name, and no later statement can move it, so a stylesheet that opens a `ds` layer before this one is read puts every pragma layer below the boundary — and the boundary then reverts pragma instead of Vanilla. Every component renders as bare markup, with nothing in the console. "What this package does not fix" has the detail; step 7 is how you check.

```scss
/* styles.scss — your existing stylesheet, with two changes */
@use "pkg:@canonical/styles-vanilla-adapter/layers.css";

@layer vanilla {
  @import "vanilla-framework";   /* everything you already had, unchanged, inside the block */
  @include vanilla;
  /* your patterns and overrides, as today */
}
```

The `pkg:` form inlines the statement in place and needs a package importer, which Dart Sass 1.71 and later provide and the `sass` command line enables with `--pkg-importer=node`. Without one, write `@import "@canonical/styles-vanilla-adapter/src/layers";` instead, which also inlines it.

Sass will not inline a `.css`-suffixed or `url()` import: at the top level it hoists such an import above your statement, and inside a block it emits an invalid nested `@import`. Use one of the two forms above.

### 4. Put pragma's CSS in a second entry

Create a second entry, conventionally `pragma.css`. It starts with `adapter.css` and continues with the component packages you use:

```css
/* pragma.css */
@import url("@canonical/styles-vanilla-adapter/adapter.css");
@import url("@canonical/react-ds-global-form/dist/esm/index.css");
```

Nothing here needs a `layer()` keyword or a wrapper of your own. Every stylesheet pragma ships already writes into its own layer: the design system's own rules into `normalize`, `ds.reset`, `ds.typography` and the rest, and each component package into the layer for its tier. Step 3 fixed the order of all of those names, so each sheet lands where it belongs as it loads.

That is the difference from Vanilla, which knows nothing about layers and therefore has to be wrapped by hand in step 2.

For the same reason, the order of imports inside this entry does not matter: the layers decide precedence, not the sequence. What does matter is that none of it goes inside the `vanilla` layer, which would put pragma's rules below the boundary that is supposed to keep Vanilla out of them. Resolve the entry with whatever already resolves package imports in your pipeline.

The first import brings `@canonical/styles/tokens.css`, `@canonical/styles/layout.css` and this package's `elements.css` with it. Do not import `@canonical/styles` or its `elements.css` on a mixed page: those style the whole document, which is what a pragma-only page wants and what a mixed page has to avoid.

### 5. Link them, and set the root classes

```html
<html class="site comfortable light">
  <head>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="pragma.css">
  </head>
```

Use `app comfortable light` instead of `site comfortable light` in an application. One context class, one density class, and `light`. Nothing marks the page as mixed, because nothing needs to.

Link order does not decide which framework wins, since the layers do that. What matters is that the order statement is the first rule the browser sees, which step 3 arranged.

That is the whole setup. Writing pragma components into a page that Vanilla still owns is a separate matter, and [Territories](#territories) and [Rules](#rules) below cover it: where a `ds` root may go, what may not go inside one, and how light and dark reach a component.

### 6. Declare the fonts once, for both frameworks

Both frameworks want a font, and neither ships one. Vanilla names a family and expects the page to declare it; pragma does the same. Declare the faces once, in your own stylesheet, and point both frameworks at those names.

No stylesheet in this package fetches anything. One thing pragma's `tokens.css` brings does name a file: the criticality modifiers declare `--modifier-icon` as a `url("/icons/…")`, an absolute path. Nothing is fetched unless a component reads that token, and no component in the design system does today, but if you write a rule that does, serve those icons from your own root or override the token.

In your Vanilla settings, before the Vanilla import:

```scss
$font-base-family: "Ubuntu Sans", "Ubuntu", "Cantarell", system-ui, -apple-system, "Segoe UI", sans-serif;
$font-monospace: "Ubuntu Sans Mono", "Ubuntu Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
```

In your own stylesheet, the faces themselves:

```css
@font-face {
  font-family: "Ubuntu Sans";
  src: url("@canonical/ds-assets/fonts/ubuntu-sans/UbuntuSans[wdth,wght].woff2")
    format("woff2-variations");
  font-weight: 100 800;
  font-stretch: 75% 100%;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Ubuntu Sans";
  src: url("@canonical/ds-assets/fonts/ubuntu-sans/UbuntuSans-Italic[wdth,wght].woff2")
    format("woff2-variations");
  font-weight: 100 800;
  font-stretch: 75% 100%;
  font-style: italic;
  font-display: swap;
}
```

Three things to know about those blocks. Adjust the two `url()` paths to however your build resolves package assets. There is no monospace face to declare, because the files `@canonical/ds-assets` ships under that name are not fonts yet, so monospace text falls back to the stack above, which is where it would land anyway. And leave `@canonical/styles/fonts` out of `pragma.css`: it declares these same two faces from these same files, so loading it as well declares each face twice.

The alternative, letting each framework name its own family, downloads the same typeface twice and leaves the two territories on slightly different metrics.

### 7. Check it

Five things tell you the page is set up correctly. The order statement is the first rule in your built CSS, before anything that mentions a `ds` layer. Every rule sits in a declared layer. The only `!important` declarations outside `vanilla` are the four this package writes into `vanilla.escapes`, which answer Vanilla's own. The root carries its classes. And no Vanilla class appears under any `.ds`. Then run your own visual checks: if the first of the five is wrong, the page will look like unstyled markup rather than subtly off.

If something looks wrong, [Troubleshooting](#troubleshooting) starts from the symptom.

## Territories

An element with the class `ds`, and everything inside it, belongs to pragma. Vanilla classes do not go there: no `p-*`, `u-*`, `l-*` or `is-*` class at any depth, no legacy component, and no wrapper that lets Vanilla back in.

If you do put Vanilla markup inside a pragma component, it renders without Vanilla's styles, taking the browser's defaults and pragma's element baseline instead. That is the boundary working as intended rather than a bug. Migrate the content first, or leave its container Vanilla until you can.

## Rules

The rules are numbered so that a review can point at one.

**Territories**

1. No Vanilla class goes inside `.ds`, as described above.
2. Every element has one owner. Do not put a Vanilla class on a `.ds` root, and do not put `ds` on Vanilla markup. Wrap instead: `<div class="col-6"><div class="ds card">…`. The wrapper is necessary inside any Vanilla container whose rules target its direct children, such as `.row`, `.p-form--inline`, `.p-equal-height-row`, `.p-divider` or `.p-navigation__dropdown`, because a `.ds` root placed there loses its grid placement.
3. Swap components inside-out: controls first, then groups, then containers, then page shells. Change a container once nothing Vanilla remains inside it, and give a region `ds` once it is clear of Vanilla.

**The root element**

4. From day one, write `<html class="site comfortable light">` on a site, or `app comfortable light` in an application: one context, one density, and `light`. Nothing marks the page as mixed, because nothing needs to. Pragma's territory is the elements carrying `ds`, and `elements.css` confines pragma's element styles to them by itself. Do not put `ds` on `<html>` while Vanilla is in the page, because that makes the whole document a pragma island and the boundary then reverts every Vanilla rule in it.
5. There is no flip from one framework to the other. A pragma page and a mixed page carry the same root classes, and only the stylesheet differs. A pragma page loads `@canonical/styles`, whose element layers style the whole document. A mixed page loads this package instead. The last state before Vanilla goes is simply a page with no Vanilla class left in it.

**Light and dark mode**

6. While both frameworks are on the page, Vanilla's mode classes decide light or dark, and nothing else does. A dark page is `<body class="is-dark">`, a dark section is `.p-strip--dark` or `.p-strip.is-dark`, and a light island inside one is `.is-light` or `.is-paper`. Pragma components inside them inherit the right mode through the bridge, and you add nothing to the markup for it.
7. A `.dark` or `.light` class on a pragma root inside a Vanilla page has no effect, because the bridge wins for as long as `adapter.css` is loaded. If a region has no Vanilla mode class around it and needs a mode of its own, declare `color-scheme` from your `app` layer, which sits above every pragma layer including the bridge.
8. The operating system's dark mode does not reach the page while both frameworks are on it. Once this package is gone, pragma decides the mode: keep `light` or `dark` on `<html>` as a toggle, or remove the pin to follow the system.
9. Leave `color-scheme` to the bridge. An unlayered `:root` rule that sets it beats every mode class and every layer.

**What not to reach for**

10. Four things this arrangement does not need, each of them a sign that something else is wrong. An `!important` to win an argument, which takes the decision away from the layers. This package writes four, and they are the exception that shows the rule: an important declaration can only be answered by another one from a lower layer, which is why they exist and why they name single properties rather than `all`. A hand-written reset against Vanilla, when the boundary already does that and the real problem is in the territories. A wrapper or an island that lets Vanilla back inside `.ds`. A build step or a transform to make the two frameworks fit, which usually means something is on the wrong side of a boundary.

## Design notes

How the layers, the boundary, the mode bridge and the confined copy work, and why the selectors are written the way they are, is in [DESIGN.md](./DESIGN.md).

## Browser support

| Feature | What it binds | Chrome | Safari | Firefox | Users |
| --- | --- | --- | --- | --- | --- |
| `@layer` | every page that loads this package: the order statement | 99 | 15.4 | 97 | 96.6% |
| `revert` | every mixed page: the boundary | 84 | 9.1 | 67 | 97.0% |
| `:where()`, `:is()` | every mixed page: the boundary and the bridge | 88 | 14 | 78 | 97.3% |
| `@scope` | mixed pages only: `elements.css` | 118 | 17.4 | 146 | 88.6% |

The last column is the share of tracked global browser use that supports the feature, from caniuse-lite 1.0.30001780 in September 2026. Run `bunx browserslist --coverage "supports css-cascade-scope"` to check any of them yourself.

A browser below the `@scope` floor drops each confined block whole, so pragma's components render with the browser's own defaults for the three element layers while the boundary still holds. A pragma-only page is not affected, because `@canonical/styles` writes no `@scope`. Pragma's own floor, from `light-dark()`, `mod()` and the `cap` unit, is documented in that package's README and applies to both kinds of page.

## Recipes

### A Sass site

`static/sass/styles.scss`:

```scss
/* 1. The order contract, inlined in place. `@use` with the pkg: form needs a
      package importer; without one, use @import "…/src/layers" instead. */
@use "pkg:@canonical/styles-vanilla-adapter/layers.css";

/* 2. Vanilla and everything built on it: one layer, one territory.
      global-settings sets $font-base-family and $font-monospace to
      pragma's stacks, and fonts declares the two faces (step 6). */
@import "global-settings";
@layer vanilla {
  @import "vanilla-framework";   /* inside the block: Vanilla emits a rule at import time */
  @import "cookie-policy";       /* inlined third-party CSS moves inside the layer */
  @include vanilla;
  @import "fonts";               /* the two @font-face rules from step 6 */
  @include site-patterns;        /* local patterns, as today */
  /* … overrides, as today … */
}
```

`pragma.css`, a second entry resolved by your existing import resolver and never purged:

```css
@import url("@canonical/styles-vanilla-adapter/adapter.css");
@import url("@canonical/react-ds-global-form/dist/esm/index.css");
```

Write `<html class="site comfortable light">` in the template, and link `styles.css` before `pragma.css`.

### An application built with a bundler

```css
@import url("@canonical/styles-vanilla-adapter/layers.css");
@import url("./fonts.css");                        /* the two @font-face rules from step 6 */
@import url("./vanilla.css") layer(vanilla);       /* Vanilla compiled to a file */
@import url("@canonical/styles-vanilla-adapter/adapter.css");
@import url("@canonical/react-ds-global-form/dist/esm/index.css");
@layer app { /* your pragma-era CSS */ }
```

Write `<html class="app comfortable light">`.

Bundlers emit CSS in the order their module graph reaches it, not in the order your entry lists things, so make sure the design system's CSS is reached before any component package's. A component module imported earlier can otherwise drag its package's stylesheet ahead of the order statement.

### A page with no build step

```html
<link rel="stylesheet" href="vendor/layers.css">
<link rel="stylesheet" href="fonts.css">               <!-- the two @font-face rules from step 6 -->
<link rel="stylesheet" href="vendor/vanilla.css">      <!-- wrapped in @layer vanilla { … } -->
<link rel="stylesheet" href="vendor/pragma.css">       <!-- adapter.css with its imports resolved into one file, then the component sheets -->
<link rel="stylesheet" href="style.css">               <!-- your CSS, inside @layer vanilla or @layer app -->
```

With no Sass to set them, Vanilla's family variables are compiled into `vendor/vanilla.css` already, so build that file with pragma's stacks or restate the two families in `style.css`.

## Guarantees

Each line names the fixture that checks it, in `tests/`. The one that compares the confined copy against pragma's stylesheets runs without a browser; the rest render two pages and compare what the browser computes, so a value that is wrong on both pages fails rather than passes.

- The confined copy is pragma's element layers, rule for rule and declaration for declaration, under the selector mapping in [DESIGN.md](./DESIGN.md). One rule exists only in the copy, and it names its reason. (`tests/elements.test.ts`)
- No Vanilla rule styles an element inside pragma's territory for any declaration that is not `!important`. Every such property is either the browser's default or pragma's. (`tests/territory.test.ts`, over the full property list, and `tests/vanilla-territory.test.ts:37` for the explicit checks on `--vf-color-text-default`, the root line height and `box-sizing`)
- The six Vanilla `!important` declarations that can reach inside an island are answered in kind, from a layer below Vanilla. (`tests/boundary.test.ts`)
- An element that is itself an island root is styled as it would be on a pragma-only page, whatever element it is. (`tests/boundary.test.ts`, over sixteen of them)
- A Vanilla ancestor does not push its inherited properties into an island, with one deliberate exception named below. (`tests/boundary.test.ts`)
- A pragma element inside a Vanilla page computes the same styles as it would on a pragma-only page, for every property pragma declares or leaves to the browser. (`tests/territory.test.ts`)
- Vanilla does not style the `.ds` root itself. (`tests/territory.test.ts:123` for placement inside Vanilla containers, `tests/vanilla-territory.test.ts` for the full-longhand comparison)
- A pragma root inside a Vanilla dark section computes `color-scheme: dark`, and its token-driven colours match pragma's dark page. Inside a light or paper section it computes light. (`tests/theme.test.ts`, covering the four theme cases and `.is-paper`)
- Installing this package does not change Vanilla's territory, with one exception named below: every element outside `.ds`, including `html` and `body`, matches the Vanilla-only page. (`tests/vanilla-territory.test.ts`, at 1280 and 1700 pixels)
- Where `adapter.css` sits inside your pragma entry does not matter. Where `layers.css` sits does. (`tests/order.test.ts`, and the negative case in `tests/boundary.test.ts`)
- After removal, the page renders as a pragma page and every root follows pragma's own `light` and `dark` classes. (`tests/theme.test.ts`)

## What this package does not fix

Each of these is a real difference between a mixed page and a pragma-only page. They are listed because they are the ones you can meet, not because they are rare enough to skip. Where there is something to do about one, it says so.

**The order statement has to be first, and nothing warns you if it is not.** A cascade layer takes its place in the order the first time a browser sees its name, and a later statement can add names but never move one. So if any stylesheet that mentions a `ds` layer reaches the browser before `layers.css` — a component package, or one of pragma's own entries — then `ds` is placed at the bottom of the order, below `boundary`, and the boundary's `all: revert` runs over pragma's own rules instead of Vanilla's. Every pragma component then renders as bare markup. There is no console warning and no partial failure; it is all or nothing. Installation step 1 is the whole defence, `adapter.css` imports the statement itself so that the single-import path cannot go wrong, and step 7 is how you check. Measured in `tests/boundary.test.ts`, both ways.

**Five pragma class names are not prefixed, and they match host markup.** `tokens.css` and `layout.css` are pragma's own entries and this package loads them whole, so their rules apply to any element on the page, not only inside an island. The names are `grid`, `subgrid`, `responsive`, `intrinsic` and `content-flow` from the layout presets, and `light` and `dark` from the theme modifiers. They sit in `ds.components.global` and `ds.modifiers`, both above `vanilla`, so where a host element already carries one of these names pragma wins. `grid` is the one worth checking for. Rename yours, or drop `layout.css` from your entry if you do not use the presets; the collision is pragma's to fix upstream, not something this package can confine without shipping a second copy.

**An island root does not inherit a table cell's text alignment.** The browser centres a `<th>`, and on a pragma-only page an island inside one inherits that. Here the island root declares `text-align: start`, because the same property is how Vanilla's `u-align--*` family would otherwise reach in, and nothing in CSS can tell a browser default from a framework's rule. The trade buys off the larger leak. Set the alignment on the island yourself where you want it.

**Vanilla has dark surfaces the bridge cannot see.** The bridge reads the two custom properties Vanilla's own themes set, which covers `.is-light`, `.is-dark`, `.is-paper`, the four themed strips, tooltips and the branded chip. A surface that is dark without setting them is invisible to it: `.p-strip--suru` paints white text on an orange gradient, and the status-label and `.p-label` families paint white on a coloured fill. A pragma component inside one of those computes `light` and renders dark text on a dark ground. Put `is-dark` on the container, or on the island itself.

**Vanilla's root font-size scaling above 1681 pixels reaches the island.** Pragma scales with it coherently, so this is a difference from a pragma-only page rather than a defect. It is deliberate: an island that did not scale with the page around it would look wrong.

**`revert` rolls back presentational attributes.** Inline SVG is excluded from the boundary for that reason. An `<img width height>` inside pragma's territory loses the size those attributes gave it, so size replaced elements in CSS as pragma's own components do. Chromium's 1px default table-cell padding is the same kind of hint and reverts to zero.

**`direction` and `unicode-bidi` are outside `all`.** Vanilla's `code, pre { direction: ltr }` still applies inside pragma's territory. It is harmless, and a right-to-left page needs its `direction` to cross the boundary anyway, which is why the island root does not declare it either. `visibility`, `pointer-events` and `cursor` are left to cross for the same reason: a host that hides, disables or marks a container busy is telling the island something, not styling it.

**Do not minify this package's CSS with Lightning CSS.** It collapses a repeated font-family name, and pragma's monospace rule uses `ui-monospace, monospace` precisely because a browser gives the bare `monospace` keyword a smaller size. esbuild leaves it alone, and so does Lightning CSS on that list; the older `monospace, monospace` spelling is the one it broke, measured at 13px against 16px.

**Under reduced motion, `transition-property` computes `none` inside the island.** Vanilla sets it with `!important` and it is left alone, because pragma honours the same preference by zeroing its motion tokens. The two agree on the result; only the property they get there with differs.

## Troubleshooting

Each heading describes a symptom. The anchors are stable, so you can link to one from a review.

<a id="leak"></a>
### An input inside a pragma component has a bottom margin, is full width, or has a chevron

Vanilla is reaching into pragma's territory. Check, in order: the order statement is the first rule of the first stylesheet, Vanilla's rules are inside `@layer vanilla`, `adapter.css` is loaded and its `boundary` block is present, and the element is under a `.ds` root.

<a id="leak-typography"></a>
### A heading inside a pragma card is italic, or a paragraph has Vanilla's spacing

Same cause as above. If the boundary is present and the leak persists, the rule is unlayered, and an unlayered rule beats every layer. Find it in your own overrides and move it inside `@layer vanilla`.

<a id="pragma-everywhere"></a>
### Vanilla's headings, paragraphs or the page font took pragma's type

`@canonical/styles` is loaded on the mixed page. Its element layers style the whole document and sit above `vanilla`. Load `adapter.css` instead: it brings `tokens.css`, `layout.css` and the confined copy, and nothing else of pragma's reaches a bare element.

<a id="theme-flip"></a>
### Pragma components went dark on a light page, or native controls turned dark

The root is missing `light`. Pragma's root declares `color-scheme: light dark` and follows the operating system unless it is pinned. Add `light` to `<html>`.

<a id="theme-bridge"></a>
### A pragma card inside a dark strip stays light

Either the strip does not set Vanilla's mode properties, or the card is not an outermost pragma root. Dark sections have to be Vanilla's, such as `is-dark` or `p-strip--dark`, since a `.dark` class on a pragma root is ignored by design. For a region with no Vanilla mode class around it, set `color-scheme` from your `app` layer.

<a id="vanilla-inside"></a>
### Vanilla styling vanished inside a Modal, a Card, or another pragma container

That is the boundary doing its job. Vanilla content inside pragma's territory is not supported. Migrate the content first, or keep the container Vanilla until you can.

<a id="child-container"></a>
### A pragma component in a `.row` or an inline form lost its column or its inline placement

Vanilla lays out its containers' direct children with `> *` rules, and the boundary reverts those on a `.ds` root. Wrap the component in a plain element.

<a id="root-flip"></a>
### Everything Vanilla went missing across the whole page

`<html>` carries `ds`, which makes the whole document a pragma island, and the boundary then reverts every Vanilla rule in it. Remove it: the document is never an island while Vanilla is in the page (rule 4).

<a id="islands-plain"></a>
### Pragma components render in the browser's font, with no baseline and no typography

The confined copy is not applying. Either the browser is below the `@scope` floor, where each block is dropped whole, or `elements.css` did not load. `adapter.css` imports it by relative path, so a pipeline that copies `adapter.css` on its own leaves it behind. Resolve the imports into one file, or keep the package's files together.

<a id="fonts"></a>
### Two font downloads, or a half-pixel baseline difference between pragma and Vanilla text

Both family names are still declared. Follow step 6 of the installation. Vanilla's "Ubuntu variable" and pragma's "Ubuntu Sans" are the same typeface from two sources, so declaring one name from one set of files changes nothing visible, except that both territories now share one set of metrics.

## Removal

This package stays until Vanilla is gone, and the two leave together. When no Vanilla class remains anywhere, one change does it: delete the `@layer vanilla` block and the Vanilla dependency, drop this package, move `@canonical/styles` into your own manifest, and replace the two imports with one:

```css
@import url("@canonical/styles");
```

Pragma's element layers then style the whole page, as they do on any pragma page. Run your checks again and decide whether `light` stays on the root. There is no intermediate state, and nothing to remember afterwards.

The removal is complete when the `@layer vanilla` block is gone, this package is out of the manifest, and the page renders identically with `@canonical/styles` in place of this package's two imports.

If you leave this package loaded on a page that no longer has Vanilla in it, nothing breaks, but two things change and neither is something this package promises. The body takes the browser's 8px margin and the browser's font, because the copy zeroes the body's margin only when the body itself is a pragma root. And the bridge, finding no Vanilla mode to read, writes `light dark` on every outermost root, so components follow the operating system whatever `<html>` says and a `.dark` class on a root is still ignored. Both are measured, and the fixtures record them so that anyone who reaches that state by accident can recognise it.
