# @canonical/styles-vanilla-adapter

Runs pragma's components inside an application that is still built with Vanilla Framework. The two frameworks style the same page without reaching into each other, so you can migrate a page at a time instead of all at once.

Your existing stylesheet stays. Everything Vanilla moves inside one cascade layer, the order statement from this package goes above it, and pragma's CSS is loaded from a second entry after it. No selector of yours changes, and nothing is rewritten by a build step.

The package ships three stylesheets and depends only on `@canonical/styles`. None of them references a font, an image or an icon, so nothing new is downloaded or copied at build time.

| File | What it does |
| --- | --- |
| `layers.css` | Declares the cascade layer order that both frameworks share. |
| `adapter.css` | Keeps Vanilla out of pragma's components, carries Vanilla's theme into them, and loads what a mixed page needs from pragma. |
| `elements.css` | Pragma's element styles, confined to pragma's components rather than applied to the whole page. |

The reasoning behind the design is in pragma's cascade explanation, `docs/explanations/STYLES_CASCADE.md`. The decisions the rules below cite are in the decision record, `F.VANILLA_COEXISTENCE`.

## Prerequisites

You need `@canonical/styles` at the first release that ships its stylesheet as three entry points: `tokens.css`, `elements.css` and `layout.css`. That release is named in the changelog. Earlier releases will not work, because the imports in `adapter.css` do not resolve and there is nothing for the confined copy to be a copy of.

The dependency is a normal one with a caret range, as in the component packages. The range pins the release the copy was taken from, and a test compares the copy against that release's source in this repository.

This package is private until that release exists. It is published once the computed-style fixtures in `tests/` pass against it.

## Installation

```bash
bun add @canonical/styles-vanilla-adapter @canonical/ds-assets
```

`@canonical/styles` comes along as a dependency of this package, at the release the copy was taken from. A mixed page does not import it directly, because `adapter.css` does that for you. It moves into your own manifest when this package leaves, which is covered under [Removal](#removal).

## Usage

Your existing stylesheet stays where it is and keeps doing what it does. You change two things about it: everything Vanilla goes inside one `@layer vanilla { … }` block, and the order statement from this package goes above that block, as the first rule of the first stylesheet the browser reads. Nothing else about your styles moves, and no selector changes.

Pragma's CSS then goes in a second entry, conventionally `pragma.css`, which the page loads after your existing stylesheet. That entry starts with `adapter.css` and continues with the component packages you use.

```scss
/* styles.scss — your existing stylesheet, with two changes */
@import "@canonical/styles-vanilla-adapter/src/layers";   /* first rule in the file */

@layer vanilla {
  @import "vanilla-framework";   /* everything you already had, unchanged, inside the block */
  @include vanilla;
  /* your patterns and overrides, as today */
}
```

```css
/* pragma.css — a second entry, loaded after styles.css */
@import url("@canonical/styles-vanilla-adapter/adapter.css");
@import url("@canonical/react-ds-global-form/dist/esm/index.css");
```

Link them in that order, `styles.css` then `pragma.css`. Link order does not decide which framework wins, because the layers do that, but the order statement has to be the first rule the browser sees.

That second import brings `@canonical/styles/tokens.css`, `@canonical/styles/layout.css` and this package's `elements.css` with it. Do not import `@canonical/styles` or its `elements.css` on a mixed page: those style the whole document, which is what a pragma-only page wants and what a mixed page must avoid.

### Fonts and other assets

None of the three stylesheets in this package references a file. Neither do the two pragma entries they load: no font, no image, no icon, so adding them downloads no assets and needs no copying step in your build.

Fonts are the one thing you declare yourself, and you do it once for both frameworks. Point Vanilla's `$font-base-family` and `$font-monospace` at pragma's stacks in your settings, write the `@font-face` rules in your own stylesheet from the files in `@canonical/ds-assets`, and leave `@canonical/styles/fonts` out of `pragma.css`. That is why `@canonical/ds-assets` is in the install line above, and rule 16 covers it. Doing it the other way, letting each framework declare its own family, downloads the same typeface twice under two names.

## Territories

An element with the class `ds`, and everything inside it, belongs to pragma. Vanilla classes do not go there: no `p-*`, `u-*`, `l-*` or `is-*` class at any depth, no legacy component, and no wrapper that lets Vanilla back in.

If you do put Vanilla markup inside a pragma component, it renders without Vanilla's styles, taking the browser's defaults and pragma's element baseline instead. That is the boundary working as intended rather than a bug. Migrate the content first, or leave its container Vanilla until you can. (VC.03)

## Rules for a mixed page

The rules are numbered so that a review can point at one, and each cites the decision behind it.

**Imports**

1. The order statement in `layers.css` is the first rule of the first stylesheet. From Sass, import it by its path inside the package so that Sass inlines it in place: `@import "@canonical/styles-vanilla-adapter/src/layers";` or `@use "@canonical/styles-vanilla-adapter/src/layers";`. Only `@charset` may come before it. (VC.02)
2. Vanilla Framework and everything built on it go inside one `@layer vanilla { … }` block: the `@import "vanilla-framework"` line itself, the site's own patterns, its overrides, and any third-party CSS it inlines. The import goes inside the block because Vanilla emits a rule at import time (`hr.is-fixed-width`), which then lands in the layer. No Vanilla-era rule stays outside it. (VC.01)
3. In a Sass entry, use extensionless imports rather than a `.css`-suffixed or `url()` one. Sass does not inline those: at the top level it hoists them above the statement, and inside a block it emits an invalid nested `@import`. (VC.27)
4. Pragma's CSS goes in a second entry, conventionally `pragma.css`: `adapter.css` first, then the component packages' stylesheets. Since `adapter.css` loads pragma's other entry points itself, a mixed page never imports `@canonical/styles` directly. Resolve the entry with whatever already resolves package imports in your pipeline. The order inside the entry does not matter, because the layers decide precedence, but none of it belongs inside the `vanilla` layer. (VC.27, VC.30)
5. Link `styles.css`, then `pragma.css`, then any React island CSS. Link order does not decide precedence either. What matters is that the order statement is the first rule the browser sees. (VC.02)
6. If you purge unused CSS, leave `pragma.css` out of it. Its classes are not in your templates until the components render. (VC.26)

**Territories**

7. No Vanilla class goes inside `.ds`, as described above. (VC.03)
8. Every element has one owner. Do not put a Vanilla class on a `.ds` root, and do not put `ds` on Vanilla markup. Wrap instead: `<div class="col-6"><div class="ds card">…`. The wrapper is necessary inside any Vanilla container whose rules target its direct children, such as `.row`, `.p-form--inline`, `.p-equal-height-row`, `.p-divider` or `.p-navigation__dropdown`, because a `.ds` root placed there loses its grid placement. (VC.03)
9. Swap components inside-out: controls first, then groups, then containers, then page shells. Change a container once nothing Vanilla remains inside it, and give a region `ds` once it is clear of Vanilla. (VC.04)

**The root element**

10. From day one, write `<html class="site comfortable light">` on a site, or `app comfortable light` in an application: one context, one density, and `light`. Nothing marks the page as mixed, because nothing needs to. Pragma's territory is the elements carrying `ds`, and `elements.css` confines pragma's element styles to them by itself. Do not put `ds` on `<html>` while Vanilla is in the page, because that makes the whole document a pragma island and the boundary then reverts every Vanilla rule in it. (VC.09, VC.30)
11. There is no flip from one framework to the other. A pragma page and a mixed page carry the same root classes, and only the stylesheet differs. A pragma page loads `@canonical/styles`, whose element layers style the whole document. A mixed page loads this package instead. The last state before Vanilla goes is simply a page with no Vanilla class left in it. (VC.03, VC.30)

**Theme**

12. While both frameworks are on the page, Vanilla's theme classes are the only source of theme. A dark page is `<body class="is-dark">`, a dark section is `.p-strip--dark` or `.p-strip.is-dark`, and a light island inside one is `.is-light` or `.is-paper`. Pragma components inside them inherit the right scheme through the bridge, and you add nothing to the markup for it. (VC.19)
13. A `.dark` or `.light` class on a pragma root inside a Vanilla page has no effect, because the bridge wins for as long as `adapter.css` is loaded. If a region has no Vanilla theme context and needs one, declare `color-scheme` from your own `app` layer, which sits above every pragma layer including the bridge. (VC.19)
14. The operating system's dark mode does not reach the page while both frameworks are on it. Once this package is gone, pragma owns theme: keep `light` or `dark` on `<html>` as a toggle, or remove the pin to follow the system. (VC.19)
15. Leave `color-scheme` to the bridge. An unlayered `:root` rule that sets it beats every theme class and every layer. (VC.19)

**Fonts**

16. Declare one family name, from one set of files, downloaded once. Point Vanilla's `$font-base-family` and `$font-monospace` at pragma's stacks (`"Ubuntu Sans", …` and `"Ubuntu Sans Mono", …`) in your settings, before the Vanilla import. Declare the `@font-face` rules yourself under pragma's names, from the files in `@canonical/ds-assets/fonts/ubuntu-sans/`, and leave `@canonical/styles/fonts` out of `pragma.css`. (VC.22)

**Checking your work**

17. Four things tell you the page is set up correctly: every rule in your built CSS sits in a declared layer, no `!important` appears outside `vanilla`, the root carries its classes, and no Vanilla class appears under any `.ds`. Then run your own visual checks. (VC.17)

**What not to reach for**

18. Four things this arrangement does not need, each of them a sign that something else is wrong. An `!important` to win an argument, which takes the decision away from the layers. A hand-written reset against Vanilla, when the boundary already does that and the real problem is in the territories. A wrapper or an island that lets Vanilla back inside `.ds`. A build step or a transform to make the two frameworks fit, which usually means something is on the wrong side of a boundary. (VC.03, VC.11, VC.24)

## How it works

Three facts about the cascade carry the design. An unlayered rule beats every layered rule. A higher layer wins whatever the selectors on either side say. And `revert` rolls a property back to the browser's own default, ignoring every author rule below the one that says it.

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
  ds.adapter,
  ds.components,
  ds.components.global,
  ds.components.sites,
  ds.components.documentation,
  ds.components.stores,
  ds.components.apps,
  app;
```

The five component layers follow the design system's tier tree, lowest first: `global`, `sites`, `documentation`, `stores`, `apps`. Naming them here means a higher tier's rule for a component beats a lower tier's by layer, whatever order your entry happens to load the component stylesheets in. A package below one of those tiers declares a layer of its own, such as `ds.components.apps-lxd`, after importing the order from `@canonical/styles/layers.css`. Because that name appears later than the statement, it sorts above the five and still below `app`. On a mixed page the extra import changes nothing, since the statement here has already fixed those names. No rule is written directly into `ds.components`, because a rule there would land in that layer's implicit final sublayer and outrank every tier. (VC.31)

The bridge writes into `ds.adapter`, which is a sublayer of `ds` rather than a top-level layer, and that matters. Sublayers sort inside their parent, and `ds` takes its place in the order where it is first mentioned, at `ds.tokens`. A top-level layer written between `ds.states` and `ds.components` would therefore not sit between them at all: it would sit above every pragma layer, component tiers included, and a component that sets its own `color-scheme` could never beat the bridge. We measured that: a modal asking for `dark` computed `light`. As a sublayer it sits above the theme modifiers and below the components, which is where rule 13 and a component's own scheme both need it. The fixtures check all 136 pairs of the seventeen names by computed style rather than by reading the list, and check that a later sub-tier layer sorts where it should.

Pragma's own statement, the same list without `vanilla`, `boundary`, `ds.adapter` and `app`, arrives later through the entries this package imports. It changes nothing, because a later statement can add names but never reorder the ones already fixed, and it adds none.

`app` is the name of your own layer whatever context class the page carries. A site with `class="site …"` still writes `@layer app`.

`adapter.css` starts with the three imports and then fills the boundary with a single declaration. Inside pragma's territory every property Vanilla set is reverted to the browser default, and pragma's layers, all of them higher, apply on top exactly as they would on a pragma-only page:

```css
@import url("@canonical/styles/tokens.css");
@import url("@canonical/styles/layout.css");
@import url("./elements.css");

/* abridged: the shipped file lists every WebKit form part Vanilla styles,
   then each Gecko form part in a rule of its own */
@layer boundary {
  :where(.ds, .ds *):where(:not(svg, svg *), svg a),
  :where(.ds, .ds *):where(:not(svg, svg *), svg a)::before,
  :where(.ds, .ds *):where(:not(svg, svg *), svg a)::after,
  :where(.ds, .ds *)::placeholder {
    all: revert;
  }
}
```

Pseudo-elements are separate boxes with their own cascade and cannot be named inside `:where()`, so each one that Vanilla styles without a class needs its own selector. The Gecko ones sit in rules of their own, because a selector list naming a `-moz-` pseudo-element is dropped whole by other engines. Inline SVG is excluded from the boundary because `revert` also rolls back presentational attributes, which SVG draws with; the one Vanilla rule that would otherwise reach in, its bare `a` colour, is handled by keeping SVG anchors inside the boundary.

The bridge lives in the same file. Pragma keys every colour on `color-scheme`, while Vanilla keys theme on two inherited custom properties that its `.is-light`, `.is-paper`, `.is-dark` and themed strips all set. At each outermost pragma root, the nearest Vanilla theme ancestor decides, through inheritance:

```css
@layer ds.adapter {
  :where(.ds:not(.ds *)) {
    color-scheme: var(--vf-theme-light, light) var(--vf-theme-dark, dark);
  }
}
```

Under a light or paper ancestor that computes to `light`, under a dark ancestor to `dark`, and where no Vanilla theme exists at all to `light dark`, which is pragma's own default.

## The confined copy, and the test that keeps it honest

Pragma's stylesheet is an ordinary one, and it ships as three entry points. `tokens.css` holds the values, `layout.css` the layout presets, and `elements.css` the three element layers: `normalize` (pragma's reset), `ds.reset` (the page's baseline of font, colour, line height, weight, text wrapping and box sizing) and `ds.typography` (the typography package's element rules and its baseline engine). Those style the whole document, which is right on a pragma-only page.

A mixed page needs the same rules to reach only pragma's components. That is what this package's `elements.css` is: the same rules, declaration for declaration, wrapped in `@scope (.ds)` and re-addressed to a component root. The two files share a name because they are the same thing seen from two sides, one addressed to the page and one to an island, and `adapter.css` loads this one alongside pragma's other two entries.

The copy differs from the original only in its selectors:

- The document element, `html` or `:where(html)`, becomes the outermost pragma root, `:where(:scope:not(.ds *))`, keeping any `:not()` list it carried.
- `body { margin: 0 }` becomes `:where(:scope:is(body))`. The body's margin is zeroed only when the body itself is a pragma root, because the margin of an element the host page owns is not this package's decision. Anything else the body declares, such as the base font from the typography rules, lands on the pragma root.
- A list of controls, `button, input, optgroup, select, textarea` and the button and search types, becomes `:where(:scope, :scope *):is(…)`, so that a control which is itself a pragma root is reached.
- The universal box-sizing rule, `*, ::before, ::after`, is written outside the scope block as `:where(.ds, .ds *)` and its two pseudo-elements. That one is measured: it is the only rule with universal reach, and inside a scope block it cost about 135 ms of a 200 ms style-recalculation regression on a page of 10,000 elements.
- A class that a pragma root can carry, such as `.p` on a field error, `.code` on an inline code span or `.editorial` on a flipped region, is written twice, once bare and once as `:scope.p`.
- Everything else is unchanged.

What is not copied lives in `tokens.css`: the naming shims, the typographic scale, and the baseline grid unit, which the typography package declares once at zero weight so the element rules and the engine can read it plainly. Those are custom properties on the page's root, and a pragma component inherits them, so nothing else needs to travel. The copy carries the engine that pragma's `elements.css` names, the cap-unit one; if a page links a different engine itself, that engine is not confined.

`tests/elements.test.ts` keeps the copy honest. It runs under `bun run test` and needs no browser.

It reads two things and compares them. On pragma's side it takes everything `packages/styles/main/src/elements.css` composes, following its imports through `normalize.css`, `reset.css`, the typography package's `elements.css` and the engine that entry names. On this side it takes `elements.css`.

It then strips the comments, walks the rules of both, and asks four questions. Are the layer names and their order the same? Does every rule on pragma's side have exactly one counterpart here? Does that counterpart carry the same declarations, in the same order, in the same position within its layer, under the same `@media` or `@supports` condition? And is its selector the mapping above, applied to the original?

It also checks the other side of the split: that every entry point opens with pragma's thirteen-name statement, that `tokens.css` and `layout.css` bring no element rule with them, and that `tokens.css` carries the typographic scale.

When pragma changes one of those files the test fails and names the rule that moved. Bring the copy up to date, apply the mapping, and run it again. Where a rule exists on one side only, the test lists it with the reason, and fails if that reason goes stale.

## Why the CSS is written this way

Two pieces of CSS carry the copy, and both are worth understanding rather than copying.

`:where()` keeps whatever is inside it at zero specificity. That is why the copy's root rule weighs what pragma's `:where(html)` rule weighed, and why the whole reset loses to any single class in any layer above it. These are defaults, and a component or a modifier should be able to override one without escalating.

`:scope` inside a `@scope` block means the scoping root, the element that matched the prelude. It is the only way a rule inside the block can reach that element, because a selector written there is relative to the root and looks below it:

```css
@scope (.ds) {
  p { … }       /* a paragraph inside a pragma component, not the component itself */
  :scope { … }  /* the component root */
}
```

A `<p class="ds field-error p">` nested inside another pragma component is matched by the plain `p` rule through the component around it. Only one that is itself the outermost root is not, because no block contains it, and `:scope.p` exists for that case.

### One class, two jobs

`ds` sits on every pragma component root, as in `<button class="ds button">`, and the component's rules are written `.ds.button`.

Its first job is to be a namespace. Pragma's rules cannot match a host element that happens to carry `button`, every component rule starts at the same weight, and the shape is the one Semantic UI used (`ui button`). The namespace also makes the direct-child combinator usable at scale: a component's parts are addressed one level down from its root, as in `.ds.button > .icon` or `.ds.card > .card-header`, so a component nested inside another never picks up the outer component's part rules, and a stylesheet grows with the number of parts rather than with the depth of nesting. A prefix scheme such as `ds-button > .icon` would give the same.

Its second job is to mark pragma's territory, and that is the one a prefix could not do. The same class is what this package selects on, in `@scope (.ds)` in `elements.css` and in `:where(.ds, .ds *)` in `adapter.css` and the box-sizing rule. There is no way to say "any pragma element" with a prefix scheme, which is why the compound class is load-bearing here.

The weight of that class is deliberate in both jobs. As a namespace it weighs one class, and this package does not touch the component stylesheets: `.ds.button` stays at two classes, with no `:where()` and no `@scope`, and between layers the layer decides before specificity is read. As a territory marker it weighs nothing, because the element layers in the copy are defaults that must lose to everything, and inside those layers source order decides. The copy's rules land at or just below the weight of pragma's originals: `:where(:scope:not(.ds *))` is zero where `html` was one element, and `:where(:scope, :scope *):is(button)` is one element, as `button` was. The known cost of the compound is that a component rule which must beat its own base rule does so by order or by a third class, never by an ancestor prefix.

### The four patterns in `elements.css`

`:where(:scope:not(.ds *))` addresses the outermost pragma root only. Every component is a scoping root, so a bare `:scope` would put the baseline on all of them:

```css
:where(:scope:not(.ds *)) { font-family: var(--typography-text-primary-font-family); }
```

`:where(:scope, :scope *):is(button, input, …)` reaches a control that is itself a pragma root, which a scoped selector alone never matches:

```css
:where(:scope, :scope *):is(button, input, optgroup, select, textarea) { margin: 0; }
```

The universal box-sizing rule sits outside the block, for the recalculation cost described above:

```css
:where(.ds, .ds *), :where(.ds, .ds *)::before, :where(.ds, .ds *)::after { box-sizing: border-box; }
```

And `.p, :scope.p` covers an engine class on a root, for the same reason as the control rule:

```css
p, .p, :scope.p { margin-block: 0; }
```

### Why `@scope` rather than a prefix on every selector

The rule bodies and the element selectors stay identical to pragma's source, so the copy is one wrapper per layer plus the four patterns above, and the mapping the test applies stays small. There is one thing to forget per file rather than one per rule, the root has a name, and no weight is added without wrapping.

The costs are worth stating. There is a browser floor of Chrome 118, Safari 17.4 and Firefox 146, below which a browser drops the whole block. A scoping root is not inside its own block, which is what forces the patterns above. And a universal selector inside a block is expensive, which is why one rule sits outside. The choice belongs to this package alone: the copy could switch to the `:where(.ds)` prefix form, with its mapping, without touching pragma.

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
/* 1. The order contract. Extensionless, so Sass inlines it in place. */
@import "@canonical/styles-vanilla-adapter/src/layers";

/* 2. Vanilla and everything built on it: one layer, one territory.
      Your settings file points $font-base-family and $font-monospace
      at pragma's stacks (rule 16). */
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

## What this package guarantees

Each line names the fixture that checks it. The fixtures live in `tests/`, and the binding test runs without a browser.

- The confined copy is pragma's element layers, rule for rule and declaration for declaration, under the mapping described above. (`elements`)
- No Vanilla rule styles an element inside pragma's territory: every property there is either the browser's default or pragma's. (`territory-equals-pragma-only`, with explicit checks on `--vf-color-text-default`, the root line height, `box-sizing` and `color-scheme`)
- A pragma element inside a Vanilla page computes the same styles as it would on a pragma-only page, for every property pragma declares or leaves to the browser, and a pragma root inherits pragma's baseline rather than the page's. (`territory-equals-pragma-only`, over the full property list)
- Vanilla does not style the `.ds` root itself. (`root-not-styled`, including a `<button class="ds button">` against Vanilla's `button` rule)
- A pragma root inside a Vanilla dark context computes `color-scheme: dark`, and its token-driven colours match pragma's dark page. Inside a light or paper context it computes light. (`theme-bridge`, covering the four theme cases and `.is-paper`)
- Installing this package does not change Vanilla's territory: every element outside `.ds`, including `html` and `body`, matches the Vanilla-only page. (`vanilla-territory-untouched`, at 1280 and 1700 pixels)
- Where `adapter.css` sits inside `pragma.css` does not matter. (`order-independence`)
- After removal, the page renders as a pragma page and every root follows pragma's theme classes. (`removal`)

## What it does not guarantee

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

`<html>` carries `ds`, which makes the whole document a pragma island, and the boundary then reverts every Vanilla rule in it. Remove it: the document is never an island while Vanilla is in the page (rule 10).

<a id="islands-plain"></a>
### Pragma components render in the browser's font, with no baseline and no typography

The confined copy is not applying. Either the browser is below the `@scope` floor, where each block is dropped whole, or `elements.css` did not load. `adapter.css` imports it by relative path, so a pipeline that copies `adapter.css` on its own leaves it behind. Resolve the imports into one file, or keep the package's files together.

<a id="fonts"></a>
### Two font downloads, or a half-pixel baseline difference between pragma and Vanilla text

Both family names are still declared. Follow rule 16. Vanilla's "Ubuntu variable" and pragma's "Ubuntu Sans" are the same typeface from two sources, so declaring one name from one set of files changes nothing visible, except that both territories now share one set of metrics.

## Removal

This package stays until Vanilla is gone, and the two leave together. When no Vanilla class remains anywhere, one change does it: delete the `@layer vanilla` block and the Vanilla dependency, drop this package, move `@canonical/styles` into your own manifest, and replace the two imports with one:

```css
@import url("@canonical/styles");
```

Pragma's element layers then style the whole page, as they do on any pragma page. Run your checks again and decide whether `light` stays on the root. There is no intermediate state, and nothing to remember afterwards. (VC.18, VC.34)

The removal is complete when the `@layer vanilla` block is gone, this package is out of the manifest, and the page renders identically with `@canonical/styles` in place of this package's two imports.

If you leave this package loaded on a page that no longer has Vanilla in it, nothing breaks, but two things change and neither is something this package promises. The body takes the browser's 8px margin and the browser's font, because the copy zeroes the body's margin only when the body itself is a pragma root. And the bridge, finding no Vanilla theme to read, writes `light dark` on every outermost root, so components follow the operating system whatever `<html>` says and a `.dark` class on a root is still ignored. Both are measured, and the fixtures record them so that anyone who reaches that state by accident can recognise it.
