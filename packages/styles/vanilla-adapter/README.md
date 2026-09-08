# @canonical/styles-vanilla-adapter

Runs pragma's components inside an application that is still built with Vanilla Framework. The two frameworks style the same page without reaching into each other, so you can migrate a page at a time instead of all at once.

Your existing stylesheet stays. Everything Vanilla moves inside one cascade layer, the order statement from this package goes above it, and pragma's CSS is loaded from a second entry after it. No selector of yours changes, and nothing is rewritten by a build step.

The package ships three stylesheets and depends only on `@canonical/styles`. None of them references a font, an image or an icon, so nothing new is downloaded or copied at build time.

| File | What it does |
| --- | --- |
| `layers.css` | Declares the cascade layer order that both frameworks share. |
| `adapter.css` | Keeps Vanilla out of pragma's components, carries Vanilla's theme into them, and loads what a mixed page needs from pragma. |
| `elements.css` | Pragma's element styles, confined to pragma's components rather than applied to the whole page. |

The reasoning behind the design is in pragma's cascade explanation, `docs/explanations/STYLES_CASCADE.md`.

## Prerequisites

You need `@canonical/styles` 0.40.0 or later, the release that ships its stylesheet as three entry points: `tokens.css`, `elements.css` and `layout.css`. Earlier releases will not work, because the imports in `adapter.css` do not resolve and there is nothing for the confined copy to be a copy of.

The dependency is a normal one with a caret range, as in the component packages, and it pins the release the copy was taken from. A test compares the copy against that release's source in this repository, so the two cannot drift apart.

This package is private until that release is out. It is published at the same time, once the computed-style fixtures in `tests/` pass against it.

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

Resolve this entry with whatever already resolves package imports in your pipeline. The order of imports inside it does not matter, because the layers decide precedence, but none of it belongs inside the `vanilla` layer.

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

### 6. Declare the fonts once, for both frameworks

None of the three stylesheets in this package references a file, and neither do the two pragma entries they load: no font, no image and no icon, so nothing new is downloaded and no copying step is added to your build.

Fonts are the exception, and you declare them yourself so that both frameworks share one set. Point Vanilla's `$font-base-family` and `$font-monospace` at pragma's stacks in your settings, before the Vanilla import. Write the `@font-face` rules in your own stylesheet, from the files in `@canonical/ds-assets`, and leave `@canonical/styles/fonts` out of `pragma.css`. That is what `@canonical/ds-assets` is for in step 1.

Letting each framework declare its own family downloads the same typeface twice under two names, and leaves the two territories on slightly different metrics.

### 7. Check it

Four things tell you the page is set up correctly: every rule in your built CSS sits in a declared layer, no `!important` appears outside `vanilla`, the root carries its classes, and no Vanilla class appears under any `.ds`. Then run your own visual checks.

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

**Theme**

6. While both frameworks are on the page, Vanilla's theme classes are the only source of theme. A dark page is `<body class="is-dark">`, a dark section is `.p-strip--dark` or `.p-strip.is-dark`, and a light island inside one is `.is-light` or `.is-paper`. Pragma components inside them inherit the right scheme through the bridge, and you add nothing to the markup for it.
7. A `.dark` or `.light` class on a pragma root inside a Vanilla page has no effect, because the bridge wins for as long as `adapter.css` is loaded. If a region has no Vanilla theme context and needs one, declare `color-scheme` from your own `app` layer, which sits above every pragma layer including the bridge.
8. The operating system's dark mode does not reach the page while both frameworks are on it. Once this package is gone, pragma owns theme: keep `light` or `dark` on `<html>` as a toggle, or remove the pin to follow the system.
9. Leave `color-scheme` to the bridge. An unlayered `:root` rule that sets it beats every theme class and every layer.

**What not to reach for**

10. Four things this arrangement does not need, each of them a sign that something else is wrong. An `!important` to win an argument, which takes the decision away from the layers. A hand-written reset against Vanilla, when the boundary already does that and the real problem is in the territories. A wrapper or an island that lets Vanilla back inside `.ds`. A build step or a transform to make the two frameworks fit, which usually means something is on the wrong side of a boundary.

## Design notes

How the layers, the boundary, the theme bridge and the confined copy work, and why the selectors are written the way they are, is in [DESIGN.md](./DESIGN.md).

## Browser support

| Feature | What it binds | Chrome | Safari | Firefox |
| --- | --- | --- | --- | --- |
| `@layer` | every page that loads this package: the order statement | 99 | 15.4 | 97 |
| `revert` | every mixed page: the boundary | 84 | 9.1 | 67 |
| `:where()`, `:is()` | every mixed page: the boundary and the bridge | 88 | 14 | 78 |
| `@scope` | mixed pages only: `elements.css` | 118 | 17.4 | 146 |

A browser below the `@scope` floor drops each confined block whole, so pragma's components render with the browser's own defaults for the three element layers while the boundary still holds. A pragma-only page is not affected, because `@canonical/styles` writes no `@scope`. Pragma's own floor, from `light-dark()`, `mod()` and the `cap` unit, is documented in that package's README and applies to both kinds of page.

## Recipes

### A Sass site

`static/sass/styles.scss`:

```scss
/* 1. The order contract, inlined in place. `@use` with the pkg: form needs a
      package importer; without one, use @import "…/src/layers" instead. */
@use "pkg:@canonical/styles-vanilla-adapter/layers.css";

/* 2. Vanilla and everything built on it: one layer, one territory.
      Your settings file points $font-base-family and $font-monospace
      at pragma's stacks — see step 6 of the installation. */
@import "global-settings";
@layer vanilla {
  @import "vanilla-framework";   /* inside the block: Vanilla emits a rule at import time */
  @import "cookie-policy";       /* inlined third-party CSS moves inside the layer */
  @include vanilla;
  @import "fonts";               /* your @font-face, under pragma's names */
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
@import url("./fonts.css");                        /* your @font-face under pragma's names */
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
<link rel="stylesheet" href="vendor/vanilla.css">      <!-- wrapped in @layer vanilla { … } -->
<link rel="stylesheet" href="vendor/pragma.css">       <!-- adapter.css with its imports resolved into one file, then the component sheets -->
<link rel="stylesheet" href="style.css">               <!-- your CSS, inside @layer vanilla or @layer app -->
```

## Guarantees

Each line names the fixture that checks it. The fixtures live in `tests/`; the one that compares the confined copy against pragma's stylesheets runs without a browser.

- The confined copy is pragma's element layers, rule for rule and declaration for declaration, under the selector mapping in [DESIGN.md](./DESIGN.md). (`elements`)
- No Vanilla rule styles an element inside pragma's territory: every property there is either the browser's default or pragma's. (`territory-equals-pragma-only`, with explicit checks on `--vf-color-text-default`, the root line height, `box-sizing` and `color-scheme`)
- A pragma element inside a Vanilla page computes the same styles as it would on a pragma-only page, for every property pragma declares or leaves to the browser, and a pragma root inherits pragma's baseline rather than the page's. (`territory-equals-pragma-only`, over the full property list)
- Vanilla does not style the `.ds` root itself. (`root-not-styled`, including a `<button class="ds button">` against Vanilla's `button` rule)
- A pragma root inside a Vanilla dark context computes `color-scheme: dark`, and its token-driven colours match pragma's dark page. Inside a light or paper context it computes light. (`theme-bridge`, covering the four theme cases and `.is-paper`)
- Installing this package does not change Vanilla's territory: every element outside `.ds`, including `html` and `body`, matches the Vanilla-only page. (`vanilla-territory-untouched`, at 1280 and 1700 pixels)
- Where `adapter.css` sits inside `pragma.css` does not matter. (`order-independence`)
- After removal, the page renders as a pragma page and every root follows pragma's theme classes. (`removal`)

## Known limitations

- Vanilla's `!important` declarations still apply inside pragma's territory wherever their selectors match. The only one that can match without a Vanilla class present is `* { animation: none !important; transition: none !important }` under reduced motion, and pragma honours that preference itself by zeroing its motion tokens, so the two pages agree wherever a component reads them.
- A control that is itself an outermost pragma root and has no component stylesheet, such as a bare `<button class="ds">`, computes `line-height: normal` where a pragma-only page gives it normalize's `1.15`. On a pragma root the baseline lands on the control itself and beats the control rule; on a page, `html` and `button` are different elements. Every pragma component declares its own line height, so this only affects a bare control.
- Vanilla's root font-size scaling above 1681 pixels reaches pragma's territory through `rem`, and pragma scales with it coherently.
- `revert` also rolls back presentational attributes. Inline SVG is excluded from the boundary for that reason, and an `<img width height>` inside pragma's territory loses the size those attributes gave it, so size replaced elements in CSS as pragma's own components do. Chromium's 1px default table-cell padding is the same kind of hint and reverts to zero.
- `direction` and `unicode-bidi` are outside `all`, so Vanilla's `code, pre { direction: ltr }` still applies inside pragma's territory. It is harmless.

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

Either the strip does not set Vanilla's theme properties, or the card is not an outermost pragma root. Dark contexts have to be Vanilla's, such as `is-dark` or `p-strip--dark`, since a `.dark` class on a pragma root is ignored by design. For a region with no Vanilla theme context, set `color-scheme` from your `app` layer.

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

If you leave this package loaded on a page that no longer has Vanilla in it, nothing breaks, but two things change and neither is something this package promises. The body takes the browser's 8px margin and the browser's font, because the copy zeroes the body's margin only when the body itself is a pragma root. And the bridge, finding no Vanilla theme to read, writes `light dark` on every outermost root, so components follow the operating system whatever `<html>` says and a `.dark` class on a root is still ignored. Both are measured, and the fixtures record them so that anyone who reaches that state by accident can recognise it.
