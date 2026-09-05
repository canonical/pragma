# @canonical/styles-vanilla-adapter

For the team adopting pragma in an application that still runs Vanilla Framework.

Two stylesheets, no tooling: `layers.css` declares the layer order both systems share, and `adapter.css` holds the boundary that keeps Vanilla out of pragma territory and the bridge that carries Vanilla's theme into pragma's. What you read in those two files is what the browser runs. The argument behind every rule below is in pragma's cascade explanation (`docs/explanations/CASCADE.md`, arriving with the styles release this package needs); the decision record it cites is pragma-adrs F (`F.VANILLA_COEXISTENCE`), by decision id.

## The one rule that is not negotiable

**Pragma territory tolerates no Vanilla inside it.** An element with the class `ds`, and everything inside it, is pragma's. No `p-*`, `u-*`, `l-*` or `is-*` class, no legacy component, no wrapper that lets Vanilla back in, at any depth. Such markup is unsupported: it renders without Vanilla's styles, with the browser's defaults and pragma's element baseline. The remedy is to migrate that content first, or to keep its container Vanilla until you can. (VC.03)

Everything else follows from that rule.

## Prerequisites

This package needs `@canonical/styles` at the first release whose element-level layers are written inside `@scope (html:not(.coexist), .ds)`, so that a root marked `coexist` confines them to pragma territory, and whose territory root declares pragma's baseline; its changelog names it. With an older release the boundary still keeps Vanilla's rules out of pragma components, but everything pragma ships unlayered leaks into Vanilla territory, and a pragma root still inherits Vanilla's font, colour and line-height from the page.

Until that release exists, this package is marked private and is not published. The computed-style fixtures that prove its guarantees are in `tests/`; the ones that need the scoped release skip with the reason printed, and the package is published when they all pass.

## Installation

```bash
bun add @canonical/styles @canonical/styles-vanilla-adapter @canonical/ds-assets
```

## The rules

Numbered so a review can cite one. Each ends with the decision in pragma-adrs F that justifies it.

**Imports**

1. The first rule of the first stylesheet is the order statement in `layers.css`. From Sass, import it by its extensionless path so Sass inlines it in place: `@import "@canonical/styles-vanilla-adapter/layers";` or `@use "@canonical/styles-vanilla-adapter/layers";`. Nothing precedes it except `@charset`. (VC.02)
2. Vanilla Framework and everything built on it go inside one `@layer vanilla { … }` block: the `@import "vanilla-framework"` line itself, the site's own patterns, its overrides, and the third-party CSS it inlines. The import goes inside because Vanilla emits one rule at import time (`hr.is-fixed-width`); nested, it lands in the layer. No Vanilla-era rule stays outside it. (VC.01)
3. In a Sass entry, never a `.css`-suffixed or `url()` import. Sass does not inline those: at top level it hoists them above the statement, and inside a block it emits an invalid nested `@import`. Extensionless imports only. (VC.27)
4. Pragma's CSS is a second entry, `pragma.css`: `@canonical/styles`, the component packages' stylesheets, and `adapter.css`. Resolve it with whatever your pipeline already resolves package imports with. The order inside that entry does not matter, because precedence comes from the layers, but none of it goes inside the `vanilla` layer. (VC.27)
5. Link `styles.css` (the Vanilla layer), then `pragma.css`, then any React-island CSS. Link order does not decide precedence either; the layers do. What matters is that the statement is the first rule the browser sees. (VC.02)
6. If you purge CSS, never purge `pragma.css`: its classes are not in your templates until you render the components. (VC.26)

**Territories**

7. The rule above, restated: no Vanilla inside `.ds`, ever. (VC.03)
8. One owner per element. Never a Vanilla class on a `.ds` root; never `ds` on Vanilla markup. Wrap instead: `<div class="col-6"><div class="ds card">…`. The wrapper is not optional inside a Vanilla container whose rules target its direct children (`.row`, `.p-form--inline`, `.p-equal-height-row`, `.p-divider`, `.p-navigation__dropdown`, …): a `.ds` root placed there loses its grid placement. (VC.03)
9. Swap inside-out: controls, then groups, then containers, then page shells. A container type is swapped only where nothing Vanilla remains inside it. A region gets `ds` only when it is empty of Vanilla; the document flips last. (VC.04)

**Root declaration**

10. From day one: `<html class="coexist site comfortable light">` on a site, `coexist app comfortable light` on an application. Exactly one context, exactly one density, `light`, and `coexist`. The last one is this package's marker: it confines pragma's element styles and the boundary to the subtrees that carry `ds`. Without it the whole document is pragma territory, legacy markup included, which is what an ordinary pragma page wants and a coexisting page does not. (VC.09)
11. The last state before Vanilla is removed drops `coexist` from `<html>`: pragma's element styles then apply to the whole document and the boundary reverts every Vanilla rule everywhere. (VC.03)

**Theme**

12. During coexistence theme has one source of truth: Vanilla's theme classes. A dark page is `<body class="is-dark">`, a dark section is `.p-strip--dark` or `.p-strip.is-dark`, a light island inside is `.is-light` or `.is-paper`. Pragma components inside inherit the right scheme through the bridge; nothing pragma-specific is added to the markup. (VC.19)
13. Never `.dark` or `.light` on a pragma root inside a Vanilla page: the bridge wins and the class is ignored, by design. The escape hatch for a region with no Vanilla theme context is a `color-scheme` declaration from your own `app` layer, which sits above `adapter`. (VC.19)
14. No operating-system dark mode during coexistence. After the flip, pragma owns theme: keep `light` or `dark` on `<html>` as a toggle, or remove the pin to follow the system. (VC.19)
15. Never override `color-scheme` from an unlayered `:root` rule; it beats every theme class and every layer. (VC.19)

**Fonts**

16. One family name, one declaration, one download. Set Vanilla's `$font-base-family` and `$font-monospace` to pragma's stacks (`"Ubuntu Sans", …` and `"Ubuntu Sans Mono", …`) in your settings, before the Vanilla import. Declare the `@font-face` rules yourself, under pragma's names, from the files in `@canonical/ds-assets/fonts/ubuntu-sans/`, and omit `@canonical/styles/fonts` from `pragma.css`. (VC.22)

**Verification**

17. Done means four things. Every rule in your built CSS sits in a declared layer. No `!important` exists outside `vanilla`. The root carries its classes. No Vanilla class appears under any `.ds`. Then your own visual checks pass. (VC.17)

**Never**

18. Never `!important` to win a fight. Never a hand-written reset against Vanilla; fix the territory. Never an island, a wrapper or any other way back into Vanilla inside `.ds`. Never a build step or a transform to make the two systems fit; if you think you need one, something is outside its territory. (VC.03, VC.11, VC.24)

**Removal**

19. When no Vanilla class remains and `<html>` no longer carries `coexist`, remove Vanilla in four moves. Delete the `@layer vanilla` block and the Vanilla dependencies. Delete this package and its statement, so that `@canonical/styles`' own order takes over. Decide whether `light` stays. Check again. Nothing else changes. Remove Vanilla only after the marker is gone: while `coexist` is still on the root, a pragma root with no Vanilla theme context follows the operating system (`light dark`) for as long as the adapter is loaded. (VC.18)

## How it works

Three facts about the cascade carry the design, and pragma's cascade explanation spells them out: an unlayered rule beats every layered rule, a higher layer wins whatever the specificity, and `revert` rolls a property back to the browser's own default, ignoring every author rule below the one that says it.

`layers.css` puts `vanilla` at the bottom and a `boundary` layer directly above it:

```css
@layer vanilla,
  boundary,
  normalize,
  ds.tokens,
  ds.reset,
  ds.typography,
  ds.modifiers,
  ds.surfaces,
  ds.states,
  adapter,
  ds.components,
  ds.components.global,
  ds.components.app,
  app;
```

The two component tiers are named in the statement so that an app-tier package's rule beats the global one whatever order your entry loads the component stylesheets in; a sublayer left to first appearance would make that order matter again.

`app` is the name of your own layer whatever your context class is; a site with `class="site …"` still writes `@layer app`.

`adapter.css` fills the boundary with one declaration, so that inside pragma territory every property Vanilla set is reverted to the browser default and pragma's layers, all higher, apply on top exactly as on a pragma-only page:

```css
/* abridged: the shipped file lists every WebKit form part Vanilla styles,
   then each Gecko form part in a rule of its own */
@layer boundary {
  :where(html:not(.coexist), html:not(.coexist) *, .ds, .ds *):where(:not(svg, svg *), svg a),
  :where(html:not(.coexist), html:not(.coexist) *, .ds, .ds *):where(:not(svg, svg *), svg a)::before,
  :where(html:not(.coexist), html:not(.coexist) *, .ds, .ds *):where(:not(svg, svg *), svg a)::after,
  :where(html:not(.coexist), html:not(.coexist) *, .ds, .ds *)::placeholder {
    all: revert;
  }
}
```

Pseudo-elements are separate boxes with their own cascade and cannot be named inside `:where()`, so every one Vanilla styles without a class has its own selector; the Gecko ones sit in rules of their own because a list naming a `-moz-` pseudo-element is dropped whole by other engines. SVG content is excluded because `revert` also rolls back presentational attributes, which inline SVG draws with; the one Vanilla rule that would reach in, its bare `a` colour, is kept out by leaving SVG anchors inside the boundary.

Its other layer, `adapter`, holds the theme bridge. Pragma keys every colour on `color-scheme`; Vanilla keys theme on two inherited toggle properties that its `.is-light`, `.is-paper`, `.is-dark` and themed strips all set. At each boundary root the nearest Vanilla theme ancestor decides, by inheritance:

```css
@layer adapter {
  :where(html.coexist .ds:not(.ds *)) {
    color-scheme: var(--vf-theme-light, light) var(--vf-theme-dark, dark);
  }
}
```

Under a light or paper ancestor that computes to `light`, under a dark ancestor to `dark`, and where no Vanilla theme exists to `light dark`, pragma's own default.

## Recipes

### A Sass site

`static/sass/styles.scss`:

```scss
/* 1. The order contract. Extensionless: Sass inlines it in place. */
@import "@canonical/styles-vanilla-adapter/layers";

/* 2. Vanilla and everything built on it: one layer, one territory.
      Your settings file points $font-base-family and $font-monospace
      at pragma's stacks (rule 16). */
@import "global-settings";
@layer vanilla {
  @import "vanilla-framework";   /* inside the block: Vanilla emits one rule at import time */
  @import "cookie-policy";       /* inlined third-party CSS moves inside the layer */
  @include vanilla;
  @import "fonts";               /* your @font-face, under pragma's names */
  @include site-patterns;        /* local patterns, as today */
  /* … overrides, as today … */
}
```

`pragma.css`, a second entry resolved by your existing import resolver, never purged:

```css
@import url("@canonical/styles");
@import url("@canonical/react-ds-global-form/dist/esm/index.css");
@import url("@canonical/styles-vanilla-adapter/adapter.css");
```

Template: `<html class="coexist site comfortable light">`; link `styles.css`, then `pragma.css`.

### A bundler application (Vite, esbuild)

```css
@import url("@canonical/styles-vanilla-adapter/layers.css");
@import url("./fonts.css");                        /* your @font-face under pragma's names */
@import url("./vanilla.css") layer(vanilla);       /* Vanilla compiled to a file */
@import url("@canonical/styles");
@import url("@canonical/react-ds-global-form/dist/esm/index.css");
@import url("@canonical/styles-vanilla-adapter/adapter.css");
@layer app { /* your pragma-era CSS */ }
```

`<html class="coexist app comfortable light">`.

### A build-free page

```html
<link rel="stylesheet" href="vendor/layers.css">
<link rel="stylesheet" href="vendor/vanilla.css">      <!-- wrapped in @layer vanilla { … } -->
<link rel="stylesheet" href="vendor/pragma.css">       <!-- pragma, resolved to one file, plus adapter.css -->
<link rel="stylesheet" href="style.css">               <!-- your CSS, inside @layer vanilla or @layer app -->
```

## What this package guarantees, and what it does not

Guaranteed, and checked by the computed-style fixtures in `tests/` (`bun run test`, a real Chromium through vitest's browser mode, Vanilla 4.56 and 4.58 compiled at test time). Each line names its suite as it appears in the test output. The fixtures that need the scoped release of `@canonical/styles` skip until it ships, and the run prints the reason next to each; they are marked "scoped release" below:

- No Vanilla rule styles an element inside pragma territory. Today, property by property over the properties Vanilla sets on bare elements, the placeholder colour, inline SVG, Vanilla markup inside `.ds` rendering without Vanilla's styles, and the flipped document. With the scoped release, over the full property list against a pragma-only page, and, for what a root inherits from the page (font, colour, line-height, box-sizing, font smoothing, text wrapping), pragma's baseline rather than Vanilla's. (`territory-equals-pragma-only`)
- A pragma root placed directly in a Vanilla container that styles its children loses that styling, and a wrapper keeps it, as rule 8 says: an inline form's child spacing, and a grid row's column placement, which a root carrying the column class loses too; the same page without the adapter is the control. (`territory-equals-pragma-only`, `root-not-styled`)
- Under a reduced-motion preference nothing inside pragma territory animates, on the mixed page and on a pragma-only page alike: every transition and animation duration is zero. This needs pragma's own reduced-motion rule, not the scoped release: Vanilla's `!important` in the lowest layer beats everything above it, so the two pages agree only once pragma disables its motion too. (`territory-equals-pragma-only`, skipped with that reason until then; today the non-guarantee below applies.)
- The document is pinned light, also under a dark operating system, and every pragma root computes its scheme from Vanilla's nearest theme ancestor: dark strip, light island inside dark, paper, nested root; a pragma theme class on a root inside a Vanilla page is ignored. (`theme-bridge`; the token-driven colour of every theme case matching the light or the dark pragma page, scoped release.)
- While the adapter outlives Vanilla on a document that has dropped `coexist`, every root keeps the pin; while the marker is still on, roots follow the operating system, as rule 19 warns. (`removal`)
- Vanilla territory is not changed by `adapter.css`, and Vanilla's root rules and custom properties are intact. (`vanilla-territory-untouched`; Vanilla's root line-height and the full comparison with the Vanilla-only page at 1280 and at 1700 pixels, `html` and `body` included, scoped release.)
- `layers.css` is one statement of the fourteen layers, `adapter.css` is the boundary block and the bridge block and Chromium keeps the boundary's list whole, pragma's CSS uses no layer outside the statement and carries no `!important`, and the order of `adapter.css` inside `pragma.css` does not matter. (`the order contract`, `order-independence`; `@canonical/styles` opening with its own statement, scoped release.)

Not guaranteed, stated rather than hidden:

- Vanilla's `!important` declarations still apply inside pragma territory where their selectors match. The only one that can match without a Vanilla class present is `* { animation: none !important; transition: none !important }` under reduced motion, which pragma will honour itself.
- Vanilla's root font-size scaling above 1681 pixels reaches pragma territory through `rem`; pragma scales with it coherently.
- `revert` also rolls back presentational attributes. Inline SVG is excluded from the boundary for that reason; an `<img width height>` inside pragma territory loses the size its attributes gave it, and a table cell loses the 1px default padding Chromium gives it through the table's `cellpadding` hint. Size replaced elements and pad table cells in CSS, as pragma's components do.
- `direction` and `unicode-bidi` are outside `all`, so Vanilla's `code, pre { direction: ltr }` still applies inside pragma territory. It is harmless.
- The theme bridge reads the DOM's ancestors, so a surface portalled to `<body>` (a tooltip, a menu) takes the body's theme, not the strip it was opened from.
- Vanilla's own native form controls inside a dark strip stay light, as they do today.
- `.is-paper` renders pragma light, because Vanilla treats paper as light.
- Pragma's hover and active deltas follow the root theme until pragma keys them on the inherited scheme.
- Style recalculation inside pragma territory on a mixed page costs more than on a pragma-only page, because Vanilla's selectors are still matched against every element there. The boundary rule itself adds nothing measurable: in Chromium 151 with 10,000 to 30,000 elements it is within run-to-run noise against the same page without it, and a Vanilla theme toggle is 42 to 46 percent cheaper with it. Numbers, method and caveats are in `MEASUREMENTS.md`. Measure on your largest page before you worry about it.

## Troubleshooting

Symptoms first. Each anchor is stable.

<a id="leak"></a>
### An input inside a pragma component has a bottom margin, is full width, or has a chevron

Vanilla is reaching into pragma territory. Check, in order: the order statement is the first rule of the first stylesheet; Vanilla's rules are inside `@layer vanilla`; `adapter.css` is loaded and its `boundary` block is present; the element is under a `.ds` root.

<a id="leak-typography"></a>
### A heading inside a pragma card is italic, or a paragraph has Vanilla's spacing

Same cause as above. If the boundary is present and the leak persists, the rule is unlayered: an unlayered rule beats every layer. Find it in your own overrides and move it inside `@layer vanilla`.

<a id="theme-flip"></a>
### Pragma components went dark on a light page, or native controls turned dark

The root is missing `light`: pragma's root declares `color-scheme: light dark` and follows the operating system unless pinned. Add `light` to `<html>`.

<a id="theme-bridge"></a>
### A pragma card inside a dark strip stays light

The strip does not set Vanilla's theme toggles, or the card is not a boundary root. Dark contexts must be Vanilla's (`is-dark`, `p-strip--dark`); a `.dark` class on the pragma root is ignored by design. For a region with no Vanilla theme context, set `color-scheme` from your `app` layer.

<a id="vanilla-inside"></a>
### Vanilla styling vanished inside a Modal, a Card, or another pragma container

That is the boundary doing its job. Vanilla content inside pragma territory is unsupported. Migrate the content first, or keep the container Vanilla until you can.

<a id="child-container"></a>
### A pragma component in a `.row` or an inline form lost its column or its inline placement

Vanilla lays out its containers' direct children with `> *` rules, and the boundary reverts them on a `.ds` root. Wrap the component in a plain element.

<a id="root-flip"></a>
### Everything Vanilla went missing across the whole page

`<html>` has no `coexist`. Without the marker the whole document is pragma territory and the boundary reverts every Vanilla rule. Put `coexist` back on the root until the last step of adoption, when dropping it is the final flip.

<a id="fonts"></a>
### Two font downloads, or a half-pixel baseline difference between pragma and Vanilla text

The two family names are still both declared. Follow rule 16. Vanilla's "Ubuntu variable" and pragma's "Ubuntu Sans" are the same typeface from two sources, so declaring one name from one set of files changes nothing visible except that both territories now share one set of metrics.

## Removal

Rule 19. The removal is complete when `layers.css`, `adapter.css` and the `@layer vanilla` block are gone and the page renders identically with pragma's own order statement.
