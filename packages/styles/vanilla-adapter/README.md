# @canonical/styles-vanilla-adapter

For the team adopting pragma in an application that still runs Vanilla Framework.

Two stylesheets, no tooling: `layers.css` declares the layer order both systems share, and `adapter.css` holds the boundary that keeps Vanilla out of pragma territory and the bridge that carries Vanilla's theme into pragma's. What you read in those two files is what the browser runs. The argument behind every rule below is in pragma-adrs F (`F.VANILLA_COEXISTENCE`).

## The one rule that is not negotiable

**Pragma territory tolerates no Vanilla inside it.** An element with the class `ds`, and everything inside it, is pragma's. No `p-*`, `u-*`, `l-*` or `is-*` class, no legacy component, no wrapper that lets Vanilla back in, at any depth. Such markup is unsupported: it renders with browser defaults, not with Vanilla's styles. The remedy is to migrate that content first, or to keep its container Vanilla until you can.

Everything else follows from that rule.

## Installation

```bash
bun add @canonical/styles @canonical/styles-vanilla-adapter @canonical/ds-assets
```

Requires `@canonical/styles` at a version whose element-level layers are scoped to pragma territory (the first release of pragma-adrs F, band A). With an older `@canonical/styles` the boundary still protects pragma components, but pragma's typography leaks into Vanilla territory.

## The rules

Numbered so a review can cite one. Each ends with the decision in pragma-adrs F that justifies it.

**Imports**

1. The first rule of the first stylesheet is the order statement in `layers.css`. From Sass, import it by its extensionless path so Sass inlines it in place: `@import "@canonical/styles-vanilla-adapter/layers";`. Nothing precedes it except `@charset`. (VC.02)
2. Vanilla Framework and everything built on it, the site's own patterns, its overrides and the third-party CSS it inlines, go inside one `@layer vanilla { … }` block. No Vanilla-era rule stays outside it. (VC.01)
3. In a Sass entry, never a `.css`-suffixed or `url()` import: Sass does not inline those; it hoists them above the statement at top level or emits an invalid nested `@import` inside a block. Extensionless imports only. (VC.14)
4. Pragma's CSS is a second entry, `pragma.css`: `@canonical/styles`, the component packages' stylesheets, then `adapter.css`, resolved by whatever your pipeline already uses to resolve package imports. Never inside the `vanilla` layer. (VC.24)
5. Link `styles.css` (the Vanilla layer), then `pragma.css`, then any React-island CSS. Link order does not decide precedence, the layers do, but the statement must be the first rule the browser sees. (VC.02)
6. If you purge CSS, never purge `pragma.css`: its classes are not in your templates until you render the components. (VC.10)

**Territories**

7. The rule above, restated: no Vanilla inside `.ds`, ever. (VC.03)
8. One owner per element. Never a Vanilla class on a `.ds` root; never `ds` on Vanilla markup. Wrap instead: `<div class="col-6"><div class="ds card">…`. A `.ds` root is never the direct child of a Vanilla container whose rules target `> *` (`.row`, `.p-form--inline`, `.p-equal-height-row`, `.p-divider`, `.p-navigation__dropdown`, …); wrap it, or its grid placement is lost. (VC.03)
9. Swap inside-out: controls, then groups, then containers, then page shells. A container type is swapped only where nothing Vanilla remains inside it. A region gets `ds` only when it is empty of Vanilla; the document flips last. (VC.04)

**Root declaration**

10. From day one: `<html class="site comfortable light">` on a site, `app comfortable light` on an application. Exactly one context, exactly one density, and `light`. Not `ds` yet. (VC.09)
11. The last state before Vanilla is removed adds `ds` to `<html>`: pragma's element styles then apply to the whole document and the boundary reverts every Vanilla rule everywhere. (VC.03)

**Theme**

12. During coexistence theme has one source of truth: Vanilla's theme classes. A dark page is `<body class="is-dark">`, a dark section is `.p-strip--dark` or `.p-strip.is-dark`, a light island inside is `.is-light` or `.is-paper`. Pragma components inside inherit the right scheme through the bridge; nothing pragma-specific is added to the markup. (VC.19)
13. Never `.dark` or `.light` on a pragma root inside a Vanilla page: the bridge wins and the class is ignored, by design. The escape hatch for a region with no Vanilla theme context is a `color-scheme` declaration from your own `app` layer, which sits above `adapter`. (VC.19)
14. No operating-system dark mode during coexistence. After the flip, pragma owns theme: keep `light` or `dark` on `<html>` as a toggle, or remove the pin to follow the system. (VC.19)
15. Never override `color-scheme` from an unlayered `:root` rule; it beats every theme class and every layer. (VC.19)

**Fonts**

16. One family name, one declaration, one download. Set Vanilla's `$font-base-family` and `$font-monospace` to pragma's stacks (`"Ubuntu Sans", …` and `"Ubuntu Sans Mono", …`) in your settings, before the Vanilla import. Declare the `@font-face` rules yourself, under pragma's names, from the files in `@canonical/ds-assets/fonts/ubuntu-sans/`, and omit `@canonical/styles/fonts` from `pragma.css`. Vanilla's "Ubuntu variable" is the same typeface as pragma's "Ubuntu Sans", so nothing visible changes except that both territories now share one set of metrics. (VC.22)

**Verification**

17. Done means: every rule in your built CSS sits in a declared layer; no `!important` outside `vanilla`; the root carries its three classes; no Vanilla class appears under any `.ds`; and your own visual checks pass. (VC.17)

**Never**

18. Never `!important` to win a fight. Never a hand-written reset against Vanilla; fix the territory. Never an island, a wrapper or any other way back into Vanilla inside `.ds`. Never a build step or transform to make the two systems fit; if you think you need one, something is outside its territory. (VC.03, VC.11, VC.24)

**Removal**

19. When no Vanilla class remains and `<html>` carries `ds`: delete the `@layer vanilla` block and the Vanilla dependencies, delete this package and its statement so `@canonical/styles`' own order takes over, decide whether `light` stays, and check again. Nothing else changes; the bridge already computes pragma's default where Vanilla is absent. (VC.18)

## How it works

Three facts about the cascade, and two rules that use them.

An unlayered rule beats every layered rule, so both systems must be layered for anything to be decided by the order rather than by accident. Within layers, the higher layer wins whatever the specificity. And `revert` rolls a property back to the browser's own default, ignoring every author rule below the one that says it.

`layers.css` puts `vanilla` at the bottom and a `boundary` layer directly above it:

```css
@layer vanilla, boundary, normalize, ds.tokens, ds.reset, ds.typography,
  ds.modifiers, ds.surfaces, ds.states, adapter, ds.components, app;
```

`adapter.css` fills the boundary with one rule:

```css
@layer boundary {
  :where(.ds, .ds *, .ds *::before, .ds *::after) { all: revert; }
}
```

Inside pragma territory, every property Vanilla set is reverted to the browser default, and pragma's layers, all higher, apply on top exactly as they would on a pragma-only page. Custom properties are not part of `all`, so pragma's tokens and Vanilla's theme toggles keep inheriting. In Vanilla territory nothing pragma ships competes with Vanilla: pragma's element-level layers are scoped to `.ds` at their source, and its other layers are custom properties or component classes.

The theme bridge is the second rule. Pragma keys every colour on `color-scheme`; Vanilla keys theme on two inherited toggle properties that its `.is-light`, `.is-paper`, `.is-dark` and themed strips all set. At each boundary root:

```css
@layer adapter {
  :where(.ds:not(.ds *):not(html)) {
    color-scheme: var(--vf-theme-light, light) var(--vf-theme-dark, dark);
  }
}
```

Under a light or paper ancestor that computes to `light`, under a dark ancestor to `dark`, and where no Vanilla theme exists to `light dark`, pragma's own default. The nearest Vanilla theme ancestor decides, by inheritance.

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
@import "vanilla-framework";
@layer vanilla {
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

Template: `<html class="site comfortable light">`; link `styles.css`, then `pragma.css`.

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

`<html class="app comfortable light">`.

### A build-free page

```html
<link rel="stylesheet" href="vendor/layers.css">
<link rel="stylesheet" href="vendor/vanilla.css">      <!-- wrapped in @layer vanilla { … } -->
<link rel="stylesheet" href="vendor/pragma.css">       <!-- pragma, resolved to one file, plus adapter.css -->
<link rel="stylesheet" href="style.css">               <!-- your CSS, inside @layer vanilla or @layer app -->
```

## What this package guarantees, and what it does not

Guaranteed, and checked by the fixtures in this package:

- No Vanilla rule styles an element inside pragma territory; every such property is the browser default or pragma's.
- A pragma element inside a Vanilla page computes the same styles as on a pragma-only page, for every property pragma declares or leaves to the browser.
- The `.ds` root itself is not styled by Vanilla.
- A pragma root inside a Vanilla dark context renders in pragma's dark theme; inside a light or paper context, in light.
- Vanilla territory is not changed by installing this package.

Not guaranteed, stated rather than hidden:

- Vanilla's `!important` declarations still apply inside pragma territory where their selectors match. In practice that is the universal reduced-motion rule, which pragma honours anyway.
- Vanilla's root font-size scaling above 1681 pixels reaches pragma territory through `rem`; pragma scales with it coherently.
- Vanilla's own native form controls inside a dark strip stay light, as they do today.
- `.is-paper` renders pragma light, because Vanilla treats paper as light.
- Pragma's hover and active deltas follow the root theme until pragma keys them on the inherited scheme.
- Style recalc inside pragma territory costs about fifteen percent more than on a pragma-only page, from the `all: revert` boundary. Measure on your largest page before you worry about it.

## Troubleshooting

Symptoms first. Each anchor is stable.

### An input inside a pragma component has a bottom margin, is full width, or has a chevron {#leak}

Vanilla is reaching into pragma territory. Check, in order: the order statement is the first rule of the first stylesheet; Vanilla's rules are inside `@layer vanilla`; `adapter.css` is loaded and its `boundary` block is present; the element is under a `.ds` root.

### A heading inside a pragma card is italic, or a paragraph has Vanilla's spacing {#leak-typography}

Same cause as above. If the boundary is present and the leak persists, the rule is unlayered: an unlayered rule beats every layer. Find it in your own overrides and move it inside `@layer vanilla`.

### Pragma components went dark on a light page, or native controls turned dark {#theme-flip}

The root is missing `light`: pragma's root declares `color-scheme: light dark` and follows the operating system unless pinned. Add `light` to `<html>`.

### A pragma card inside a dark strip stays light {#theme-bridge}

The strip does not set Vanilla's theme toggles, or the card is not a boundary root. Dark contexts must be Vanilla's (`is-dark`, `p-strip--dark`); a `.dark` class on the pragma root is ignored by design. For a region with no Vanilla theme context, set `color-scheme` from your `app` layer.

### Vanilla styling vanished inside a Modal, a Card, or another pragma container {#vanilla-inside}

That is the boundary doing its job. Vanilla content inside pragma territory is unsupported. Migrate the content first, or keep the container Vanilla until you can.

### A pragma component in a `.row` or an inline form lost its column or its inline placement {#child-container}

Vanilla lays out its containers' direct children with `> *` rules, and the boundary reverts them on a `.ds` root. Wrap the component in a plain element.

### Everything Vanilla went missing across the whole page {#root-flip}

`<html>` carries `ds`. That is the final flip and belongs to the last step of adoption; remove it until then.

### Two font downloads, or a half-pixel baseline difference between pragma and Vanilla text {#fonts}

The two family names are still both declared. Follow rule 16.

## Removal

Rule 19. The removal is complete when `layers.css`, `adapter.css` and the `@layer vanilla` block are gone and the page renders identically with pragma's own order statement.
