# @canonical/styles-vanilla-adapter

For the team adopting pragma in an application that still runs Vanilla Framework.

Three stylesheets, one dependency, no tooling. `layers.css` declares the layer order both systems share. `adapter.css` holds the boundary that keeps Vanilla out of pragma territory and the bridge that carries Vanilla's theme into pragma's, and it loads the other things a mixed page needs: two of pragma's three entries, `@canonical/styles/tokens.css` and `@canonical/styles/layout.css`, and `elements.css`, this package's copy of pragma's third entry, its element layers, confined to pragma territory. What you read in those three files is what the browser runs. The argument behind every rule below is in pragma's cascade explanation (`docs/explanations/CASCADE.md`, arriving with the styles release this package needs); the decision record it cites is pragma-adrs F (`F.VANILLA_COEXISTENCE`), by decision id.

## The one rule that is not negotiable

**Pragma territory tolerates no Vanilla inside it.** An element with the class `ds`, and everything inside it, is pragma's. No `p-*`, `u-*`, `l-*` or `is-*` class, no legacy component, no wrapper that lets Vanilla back in, at any depth. Such markup is unsupported: it renders without Vanilla's styles, with the browser's defaults and pragma's element baseline. The remedy is to migrate that content first, or to keep its container Vanilla until you can. (VC.03)

Everything else follows from that rule.

## Prerequisites

This package needs `@canonical/styles` at the first release that ships its stylesheet as three entries, `tokens.css`, `elements.css` and `layout.css`, each self-contained with pragma's order statement first; its changelog names it. With an older release the imports in `adapter.css` do not resolve, and there is nothing for this package's copy to be a copy of. This package depends on that release directly, as a regular dependency with a caret range, the way the component packages depend on it: the range pins the release the copy in `elements.css` was taken from, and the binding test holds the copy to that release's source in this repository.

Until that release exists, this package is marked private and is not published. The computed-style fixtures that prove its guarantees are in `tests/`, and the package is published when they pass against it.

## Installation

```bash
bun add @canonical/styles-vanilla-adapter @canonical/ds-assets
```

`@canonical/styles` comes with this package as its dependency, at the release the copy was taken from; a mixed page never imports it itself, `adapter.css` does. It joins your own manifest at removal (rule 19). Then two imports, and nothing on any root beyond what a pragma page carries:

```css
/* the first rule of the first stylesheet */
@import url("@canonical/styles-vanilla-adapter/layers.css");

/* in the pragma entry, before the component stylesheets */
@import url("@canonical/styles-vanilla-adapter/adapter.css");
```

The second import brings `@canonical/styles/tokens.css`, `@canonical/styles/layout.css` and this package's `elements.css` with it. A mixed page never imports `@canonical/styles` itself, nor its `elements.css`: those style the whole page, which is what a pragma-only page wants and a mixed page does not.

## The rules

Numbered so a review can cite one. Each ends with the decision in pragma-adrs F that justifies it.

**Imports**

1. The first rule of the first stylesheet is the order statement in `layers.css`. From Sass, import it by its extensionless path so Sass inlines it in place: `@import "@canonical/styles-vanilla-adapter/layers";` or `@use "@canonical/styles-vanilla-adapter/layers";`. Nothing precedes it except `@charset`. (VC.02)
2. Vanilla Framework and everything built on it go inside one `@layer vanilla { … }` block: the `@import "vanilla-framework"` line itself, the site's own patterns, its overrides, and the third-party CSS it inlines. The import goes inside because Vanilla emits one rule at import time (`hr.is-fixed-width`); nested, it lands in the layer. No Vanilla-era rule stays outside it. (VC.01)
3. In a Sass entry, never a `.css`-suffixed or `url()` import. Sass does not inline those: at top level it hoists them above the statement, and inside a block it emits an invalid nested `@import`. Extensionless imports only. (VC.27)
4. Pragma's CSS is a second entry, `pragma.css`: `adapter.css`, then the component packages' stylesheets. `adapter.css` loads `@canonical/styles/tokens.css`, `@canonical/styles/layout.css` and this package's `elements.css` itself, so never `@canonical/styles` on a mixed page. Resolve the entry with whatever your pipeline already resolves package imports with. The order inside it does not matter, because precedence comes from the layers, but none of it goes inside the `vanilla` layer. (VC.27, VC.30)
5. Link `styles.css` (the Vanilla layer), then `pragma.css`, then any React-island CSS. Link order does not decide precedence either; the layers do. What matters is that the statement is the first rule the browser sees. (VC.02)
6. If you purge CSS, never purge `pragma.css`: its classes are not in your templates until you render the components. (VC.26)

**Territories**

7. The rule above, restated: no Vanilla inside `.ds`, ever. (VC.03)
8. One owner per element. Never a Vanilla class on a `.ds` root; never `ds` on Vanilla markup. Wrap instead: `<div class="col-6"><div class="ds card">…`. The wrapper is not optional inside a Vanilla container whose rules target its direct children (`.row`, `.p-form--inline`, `.p-equal-height-row`, `.p-divider`, `.p-navigation__dropdown`, …): a `.ds` root placed there loses its grid placement. (VC.03)
9. Swap inside-out: controls, then groups, then containers, then page shells. A container type is swapped only where nothing Vanilla remains inside it. A region gets `ds` only when it is empty of Vanilla. (VC.04)

**Root declaration**

10. From day one: `<html class="site comfortable light">` on a site, `app comfortable light` on an application. Exactly one context, exactly one density, and `light`. Nothing marks the page as mixed: pragma territory is the islands, the elements that carry `ds`, and `elements.css` confines pragma's element styles to them on its own. Never `ds` on `<html>` while Vanilla is in the page; that makes the whole document an island, and the boundary reverts every Vanilla rule in it. (VC.09, VC.30)
11. There is no flip. A pragma page and a mixed page carry the same root classes; what differs is the stylesheet. A pragma page loads `@canonical/styles`, whose element layers style the whole page. A mixed page loads this package instead, which loads pragma's `tokens.css` and `layout.css` and its own confined copy of the third entry, the element layers. The last state before Vanilla is removed is simply a page with no Vanilla class left in it. (VC.03, VC.30)

**Theme**

12. During coexistence theme has one source of truth: Vanilla's theme classes. A dark page is `<body class="is-dark">`, a dark section is `.p-strip--dark` or `.p-strip.is-dark`, a light island inside is `.is-light` or `.is-paper`. Pragma components inside inherit the right scheme through the bridge; nothing pragma-specific is added to the markup. (VC.19)
13. Never `.dark` or `.light` on a pragma root inside a Vanilla page: the bridge wins and the class is ignored, by design, for as long as `adapter.css` is loaded. The escape hatch for a region with no Vanilla theme context is a `color-scheme` declaration from your own `app` layer, which sits above every `ds.*` layer, the bridge's `ds.adapter` included. (VC.19)
14. No operating-system dark mode during coexistence. Once this package is gone, pragma owns theme: keep `light` or `dark` on `<html>` as a toggle, or remove the pin to follow the system. (VC.19)
15. Never override `color-scheme` from an unlayered `:root` rule; it beats every theme class and every layer. (VC.19)

**Fonts**

16. One family name, one declaration, one download. Set Vanilla's `$font-base-family` and `$font-monospace` to pragma's stacks (`"Ubuntu Sans", …` and `"Ubuntu Sans Mono", …`) in your settings, before the Vanilla import. Declare the `@font-face` rules yourself, under pragma's names, from the files in `@canonical/ds-assets/fonts/ubuntu-sans/`, and omit `@canonical/styles/fonts` from `pragma.css`. (VC.22)

**Verification**

17. Done means four things. Every rule in your built CSS sits in a declared layer. No `!important` exists outside `vanilla`. The root carries its classes. No Vanilla class appears under any `.ds`. Then your own visual checks pass. (VC.17)

**Never**

18. Never `!important` to win a fight. Never a hand-written reset against Vanilla; fix the territory. Never an island, a wrapper or any other way back into Vanilla inside `.ds`. Never a build step or a transform to make the two systems fit; if you think you need one, something is outside its territory. (VC.03, VC.11, VC.24)

**Removal**

19. This package stays until Vanilla is gone, and the two leave in the same change. When no Vanilla class remains anywhere: delete the `@layer vanilla` block and the Vanilla dependency, drop this package, and swap its two imports for one, `@import url("@canonical/styles");`, with `@canonical/styles` moved into your own manifest — pragma's element layers then style the page, as they do on any pragma page. Check again. Nothing on any root to clean up; decide whether `light` stays. There is no intermediate state and nothing to remember afterwards. (VC.18, VC.34)

A note on the arrangement rule 19 rules out, this package left loaded on a page with no Vanilla in it. Nothing breaks, and two things change, neither of them a guarantee this package makes: the body computes the browser's 8px margin and the browser's font, because the copy zeroes the body's margin only when the body itself is an island; and the bridge, finding no Vanilla theme to read, writes pragma's default `light dark` on every outermost island, so islands follow the operating system whatever `<html>` carries and pragma's theme classes on a root stay ignored (rule 13). Both are measured, and the fixtures record them, so that anyone who reaches that state by accident can recognise it. The way out of it is rule 19.

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
  ds.adapter,
  ds.components,
  ds.components.global,
  ds.components.sites,
  ds.components.documentation,
  ds.components.stores,
  ds.components.apps,
  app;
```

The five component layers follow the design system's tier tree, flat, lowest first: `global`, `sites`, `documentation`, `stores`, `apps`. They are named in the statement so that a higher tier's rule for a component beats a lower tier's by layer whatever order your entry loads the component stylesheets in; a sublayer left to first appearance would make that order matter again. A package below a tier declares its own layer, flat beside these, first in its own entry (`@layer ds.components.apps-lxd;`): by appearing later than the statement it sorts above the five, and still below `app`. Nothing is written directly into `ds.components`, because a rule there would sit in its implicit final sublayer, above every tier. (VC.31)

The bridge's layer, `ds.adapter`, is a sublayer of `ds` on purpose. Sublayers sort inside their parent, and `ds` takes its place in the order at its first mention (`ds.tokens`), so a top-level layer written between `ds.states` and `ds.components` would not sit there at all: it would sit above every `ds.*` sublayer, the component tiers included, and a component that sets its own `color-scheme` could never beat the bridge (measured: a modal's `dark` computed `light`). As a sublayer between `ds.states` and `ds.components` the bridge is above the theme modifiers and below the components, which is where rule 13 and a component's own scheme both need it. The fixtures check all 136 pairs of the seventeen names by computed style, not by the list, and that a later sub-tier layer sorts where it should. Pragma's own statement, the same list without `vanilla`, `boundary`, `ds.adapter` and `app`, arrives later at the top of each of its entries and changes nothing: a later statement can add names but never reorder the ones already fixed, and it adds none.

`app` is the name of your own layer whatever your context class is; a site with `class="site …"` still writes `@layer app`.

`adapter.css` opens with the three imports, then fills the boundary with one declaration, so that inside pragma territory every property Vanilla set is reverted to the browser default and pragma's layers, all higher, apply on top exactly as on a pragma-only page:

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

Pseudo-elements are separate boxes with their own cascade and cannot be named inside `:where()`, so every one Vanilla styles without a class has its own selector; the Gecko ones sit in rules of their own because a list naming a `-moz-` pseudo-element is dropped whole by other engines. SVG content is excluded because `revert` also rolls back presentational attributes, which inline SVG draws with; the one Vanilla rule that would reach in, its bare `a` colour, is kept out by leaving SVG anchors inside the boundary.

Its other layer, `ds.adapter`, holds the theme bridge. Pragma keys every colour on `color-scheme`; Vanilla keys theme on two inherited toggle properties that its `.is-light`, `.is-paper`, `.is-dark` and themed strips all set. At each outermost island root the nearest Vanilla theme ancestor decides, by inheritance:

```css
@layer ds.adapter {
  :where(.ds:not(.ds *)) {
    color-scheme: var(--vf-theme-light, light) var(--vf-theme-dark, dark);
  }
}
```

Under a light or paper ancestor that computes to `light`, under a dark ancestor to `dark`, and where no Vanilla theme exists to `light dark`, pragma's own default.

`elements.css` is the third piece, and the next section is about it.

## The confined copy and its test

Pragma's own stylesheet is plain, and it ships as three entries: `tokens.css` (`ds.tokens`, `ds.modifiers`, `ds.surfaces`, `ds.states`), `layout.css` (the grid presets) and `elements.css`, the three element layers, `normalize` (its reset), `ds.reset` (the page's baseline: font, colour, line height, weight, text wrapping, box sizing) and `ds.typography` (the typography package's element rules and its baseline engine). Those style the whole page, and on a pragma-only page that is right. On a mixed page the same rules must reach only the islands, so this package's `elements.css` carries a copy of them, rule for rule and declaration for declaration, wrapped in `@scope (.ds)` and re-addressed to an island root. The two files share a name because they are the same thing: pragma's `elements.css` is the three layers addressed to the page, this package's is the three layers addressed to an island. `adapter.css` loads pragma's other two entries and this copy.

The copy differs from the original only in its selectors, by a short mapping:

- the document element, `html` or `:where(html)`, becomes the outermost island root, `:where(:scope:not(.ds *))`, and keeps any `:not()` list it carried;
- `body { margin: 0 }` becomes `:where(:scope:is(body))`: the body's margin is zeroed only when the body itself is the island, because the margin of an element a host page owns is not this package's call; anything else the body declares (the base font from the typography element rules) lands on the island root;
- a list of controls, `button, input, optgroup, select, textarea` and the button and search types, becomes `:where(:scope, :scope *):is(…)`, so that a control that is itself an island is reached;
- the universal box-sizing rule, `*, ::before, ::after`, is written outside the scope block as `:where(.ds, .ds *)` and its two pseudo-elements, for a measured reason: it is the only rule with universal reach, and inside a scope block it cost about 135 ms of a 200 ms style-recalculation regression on a 10,000-element page;
- a class an island root can carry (`.p` on a field error, `.code` on an inline code span, `.editorial` on a flipped region) is written twice, bare and `:scope.p`;
- everything else is itself.

What is not copied is in `tokens.css`: the naming shims and the typographic scale, which are tokens and act wherever they are written; the engine reads `--baseline-height` with a fallback of its own, so nothing else travels. The copy carries the engine pragma's `elements.css` names, the cap-unit one; a page that links another engine on its own links it unconfined.

The copy is kept honest by `tests/elements.test.ts`, which runs under `bun run test` without a browser. It reads pragma's source files from the workspace (everything `packages/styles/main/src/elements.css` composes, followed through its imports: `normalize.css`, `reset.css`, the typography package's `elements.css` and the engine it names, `baseline-cap.css` today) and this package's `elements.css`, strips comments, walks the rules of both, and asserts that the layer names and their order are the same on both sides, that every rule in pragma's files has exactly one counterpart in the copy with the same declarations in the same order, in the same order within each layer, under the same `@media` or `@supports` condition, and that each counterpart's selector is the mapping above applied to the original. It also checks the other side of the split: that every entry opens with pragma's thirteen-name statement, that `tokens.css` and `layout.css` bring no element rule with them, and that `tokens.css` carries the scale. When pragma changes one of those files the test fails naming the rule; bring the copy up to date, apply the mapping, run it again. A rule that exists on one side only is listed in the test with its reason, and the test fails if the reason goes stale.

## The `.ds` pattern in plain words

Two pieces of CSS carry the copy, and both are worth knowing rather than copying.

`:where()` keeps whatever is inside it at zero specificity. That is why the copy's root rule weighs what pragma's `:where(html)` rule weighed, and why the whole reset loses to any single class in any layer above it: these are defaults, and a component or a modifier overrides one without escalating.

`:scope` inside a `@scope` block means the scoping root, the element that matched the prelude. It is the only way a rule in the block reaches that element, because a selector written in the block is relative to the root and looks below it:

```css
@scope (.ds) {
  p { … }       /* a paragraph inside an island; never the island itself */
  :scope { … }  /* the island root */
}
```

A `<p class="ds field-error p">` nested inside any island is matched by the plain `p` rule through the island around it; only one that is itself the outermost island is not, because no block contains it, and `:scope.p` is for that one.

**One class, two jobs.** `ds` sits on every pragma component root, `<button class="ds button">`, and the component's rules are written `.ds.button`. The first job is a namespace: pragma's rules cannot match a host element that happens to carry `button`, every component rule starts at the same weight (namespace plus component class), and the shape is the Semantic UI one (`ui button`). The namespace on the root is also what makes the direct-child combinator usable at scale: a component's parts are addressed one level down from its root, `.ds.button > .icon`, `.ds.card > .card-header`, so a component nested inside another never receives the outer component's part rules, and a sheet grows with the number of parts, not with the depth of nesting. It is the shape the component sheets are written in, and inside a `@scope` block a relative selector may start with `>` for the same reason, though the confined copy does not need it. A prefix scheme (`ds-button > .icon`) gets the same from the prefix. The second job is the territory marker: the same class is what this package selects on, `@scope (.ds)` in `elements.css` and `:where(.ds, .ds *)` in `adapter.css` and the box-sizing rule. A prefix scheme would give no way to say "any pragma element", which is why the compound is load-bearing for coexistence.

**Weight is intended where it is.** In the namespace job the class weighs one class, and component sheets are untouched by this package: `.ds.button` stays two classes, no `:where()`, no `@scope`, and between layers the layer decides before specificity is read. In the territory job the class weighs nothing on purpose: the element layers in the copy are defaults that must lose to everything, and inside those layers source order arbitrates. The copy's rules are at or just below the weight of pragma's originals: `:where(:scope:not(.ds *))` is zero where `html` was one element, and `:where(:scope, :scope *):is(button)` is one element, as `button` was. The known cost of the compound is that a component rule that must beat its own base rule does it by order or a third class, never by an ancestor prefix.

**The four patterns in `elements.css`.**

`:where(:scope:not(.ds *))` is the outermost island only, because every component is a scoping root and a bare `:scope` would put the baseline on all of them:

```css
:where(:scope:not(.ds *)) { font-family: var(--typography-text-primary-font-family); }
```

`:where(:scope, :scope *):is(button, input, …)` reaches a control that can itself be an island, which a scoped selector alone never matches:

```css
:where(:scope, :scope *):is(button, input, optgroup, select, textarea) { margin: 0; }
```

The universal box-sizing rule sits outside the block as `:where(.ds, .ds *)`, for the measured recalculation cost above:

```css
:where(.ds, .ds *), :where(.ds, .ds *)::before, :where(.ds, .ds *)::after { box-sizing: border-box; }
```

`.p, :scope.p` is an engine class on a root, for the same reason as the control rule:

```css
p, .p, :scope.p { margin-block: 0; }
```

**Why `@scope` rather than a class prefix on every selector.** The rule bodies and the element selectors stay byte-identical to pragma's source, so the copy is one wrapper per layer plus the four patterns, and the binding test's mapping stays small; there is one thing to forget per file instead of one per rule; the root has a name; and no weight is added without wrapping. The costs, stated plainly: the browser floor (Chrome 118, Safari 17.4, Firefox 146), below which a browser drops the whole block; the rule that a root is not inside itself, which forces the patterns above; and the universal-rule cost, which is why one rule sits outside. The choice is this package's alone: the copy can switch to the `:where(.ds)` prefix form, with the mapping table, without touching pragma.

## Browser floor

| Feature | What it binds | Chrome | Safari | Firefox |
| --- | --- | --- | --- | --- |
| `@layer` | every page that loads this package: the order statement | 99 | 15.4 | 97 |
| `revert` | every mixed page: the boundary | 84 | 9.1 | 67 |
| `:where()`, `:is()` | every mixed page: the boundary and the bridge | 88 | 14 | 78 |
| `@scope` | mixed pages only: `elements.css` | 118 | 17.4 | 146 |

A browser below the `@scope` floor drops each confined block whole, so islands render with the browser's own defaults for the three element layers while the boundary still holds. A pragma-only page is not bound by it: `@canonical/styles` writes no `@scope`. Pragma's own floor (`light-dark()`, `mod()`, the `cap` unit) is in that package's README and binds both kinds of page.

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
@import url("@canonical/styles-vanilla-adapter/adapter.css");
@import url("@canonical/react-ds-global-form/dist/esm/index.css");
```

Template: `<html class="site comfortable light">`; link `styles.css`, then `pragma.css`.

### A bundler application (Vite, esbuild)

```css
@import url("@canonical/styles-vanilla-adapter/layers.css");
@import url("./fonts.css");                        /* your @font-face under pragma's names */
@import url("./vanilla.css") layer(vanilla);       /* Vanilla compiled to a file */
@import url("@canonical/styles-vanilla-adapter/adapter.css");
@import url("@canonical/react-ds-global-form/dist/esm/index.css");
@layer app { /* your pragma-era CSS */ }
```

`<html class="app comfortable light">`.

### A build-free page

```html
<link rel="stylesheet" href="vendor/layers.css">
<link rel="stylesheet" href="vendor/vanilla.css">      <!-- wrapped in @layer vanilla { … } -->
<link rel="stylesheet" href="vendor/pragma.css">       <!-- adapter.css with its imports resolved to one file, then the component sheets -->
<link rel="stylesheet" href="style.css">               <!-- your CSS, inside @layer vanilla or @layer app -->
```

## What this package guarantees, and what it does not

Guaranteed, and checked by the tests in `tests/` (`bun run test`): the binding test runs in node, the computed-style fixtures in a real Chromium through vitest's browser mode, against Vanilla 4.56 and 4.58 compiled at test time. Each line names its suite as it appears in the test output. One fixture, reduced motion, needs pragma's own reduced-motion rule and component sheets that read the motion tokens; it skips with the reason printed if the rule is missing:

- The confined copy is pragma's element layers, rule for rule and declaration for declaration, under the mapping above; and every entry opens with pragma's statement, `tokens.css` and `layout.css` bring no element rule with them, and `tokens.css` carries the scale. (`elements.css is pragma's element layers, confined`, `@canonical/styles exposes what a mixed page needs`, without a browser.)
- No Vanilla rule styles an element inside pragma territory: property by property over the properties Vanilla sets on bare elements, the placeholder colour, inline SVG, Vanilla markup inside `.ds` rendering without Vanilla's styles, and over the full property list against a pragma-only page; and an island root inherits pragma's baseline (font, colour, line-height, box-sizing, font smoothing, text wrapping) rather than the page's. (`territory-equals-pragma-only`)
- A pragma root placed directly in a Vanilla container that styles its children loses that styling, and a wrapper keeps it, as rule 8 says: an inline form's child spacing, and a grid row's column placement, which a root carrying the column class loses too; the same page without the adapter is the control. (`territory-equals-pragma-only`, `root-not-styled`)
- Under a reduced-motion preference nothing inside pragma territory animates, on the mixed page and on a pragma-only page alike. Vanilla's `!important` in the lowest layer beats everything above it, so the two pages agree because pragma's motion tokens go to zero under that preference too; a component that hard-codes a duration instead of reading them is not covered, which is what #1134 fixes in the form package. (`territory-equals-pragma-only`; the fixture passes with the form package's motion tokens.)
- The document is pinned light, also under a dark operating system, and every pragma root computes its scheme from Vanilla's nearest theme ancestor: dark strip, light island inside dark, paper, nested root; a pragma theme class on a root inside a Vanilla page is ignored; a component that sets its own scheme beats the bridge; and the token-driven colour of every theme case matches the light or the dark pragma page. (`theme-bridge`)
- After the removal of rule 19, Vanilla and this package gone in one change, the page renders as a pragma page: every root follows pragma's theme classes. The same fixtures record what the arrangement rule 19 rules out computes, this package loaded on a page with no Vanilla in it: every outermost island follows the operating system, and pragma's theme class on a root stays ignored. (`removal`)
- Vanilla territory is not changed by `adapter.css`: Vanilla's root rules, its custom properties and its root line-height are intact, and every element outside `.ds`, `html` and `body` included, equals the Vanilla-only page at 1280 and at 1700 pixels. (`vanilla-territory-untouched`)
- `layers.css` is one statement of the seventeen layers; `adapter.css` opens with its three imports and is the boundary block and the bridge block in `ds.adapter`, and Chromium keeps the boundary's list whole; all 136 pairs of the seventeen names sort as written, by computed style, and a sub-tier layer declared later sorts above its tier and below `app`; `elements.css` is the three layers with every rule confined; pragma's CSS uses no layer outside the statement and carries no `!important`; `@canonical/styles` and each of its entries open with pragma's own thirteen-name statement, the mixed order minus the adapter's four, so the later statement adds nothing and reorders nothing; and the order of `adapter.css` inside `pragma.css` does not matter. (`the order contract`, `order-independence`)

Not guaranteed, stated rather than hidden:

- Vanilla's `!important` declarations still apply inside pragma territory where their selectors match. The only one that can match without a Vanilla class present is `* { animation: none !important; transition: none !important }` under reduced motion, and pragma honours that preference itself: its motion tokens go to zero, so the two pages agree wherever a component reads them.
- A control that is itself an outermost island and has no component sheet, a bare `<button class="ds">`, computes `line-height: normal`, the island root's baseline, where the pragma-only page gives it normalize's `1.15`: on an island the root baseline (`ds.reset`) lands on the control itself and beats the control rule (`normalize`), on a page `html` and `button` are different elements. Every pragma component declares its own line-height, so every island kind with its component sheet measures identical on both pages; this bites only a bare control island.
- Vanilla's root font-size scaling above 1681 pixels reaches pragma territory through `rem`; pragma scales with it coherently.
- `revert` also rolls back presentational attributes. Inline SVG is excluded from the boundary for that reason; an `<img width height>` inside pragma territory loses the size its attributes gave it, and a table cell loses the 1px default padding Chromium gives it through the table's `cellpadding` hint. Size replaced elements and pad table cells in CSS, as pragma's components do.
- `direction` and `unicode-bidi` are outside `all`, so Vanilla's `code, pre { direction: ltr }` still applies inside pragma territory. It is harmless.
- The theme bridge reads the DOM's ancestors, so a surface portalled to `<body>` (a tooltip, a menu) takes the body's theme, not the strip it was opened from.
- Vanilla's own native form controls inside a dark strip stay light, as they do today.
- `.is-paper` renders pragma light, because Vanilla treats paper as light.
- Pragma's hover and active deltas follow the root theme until pragma keys them on the inherited scheme.
- Below the `@scope` floor the islands lose pragma's element layers, not the boundary.
- Style recalculation inside pragma territory on a mixed page costs more than on a pragma-only page, because Vanilla's selectors are still matched against every element there. The boundary rule itself adds nothing measurable: in Chromium 151 with 10,000 to 30,000 elements it is within run-to-run noise against the same page without it, and a Vanilla theme toggle is 42 to 46 percent cheaper with it. Numbers, method and caveats are in `MEASUREMENTS.md`. Measure on your largest page before you worry about it.

## Troubleshooting

Symptoms first. Each anchor is stable.

<a id="leak"></a>
### An input inside a pragma component has a bottom margin, is full width, or has a chevron

Vanilla is reaching into pragma territory. Check, in order: the order statement is the first rule of the first stylesheet; Vanilla's rules are inside `@layer vanilla`; `adapter.css` is loaded and its `boundary` block is present; the element is under a `.ds` root.

<a id="leak-typography"></a>
### A heading inside a pragma card is italic, or a paragraph has Vanilla's spacing

Same cause as above. If the boundary is present and the leak persists, the rule is unlayered: an unlayered rule beats every layer. Find it in your own overrides and move it inside `@layer vanilla`.

<a id="pragma-everywhere"></a>
### Vanilla's headings, paragraphs or the page font took pragma's type

`@canonical/styles` is loaded on the mixed page. Its element layers style the whole page, and they sit above `vanilla`. Load `adapter.css` instead: it brings `tokens.css`, `layout.css` and the confined copy, and nothing else of pragma's reaches a bare element.

<a id="theme-flip"></a>
### Pragma components went dark on a light page, or native controls turned dark

The root is missing `light`: pragma's root declares `color-scheme: light dark` and follows the operating system unless pinned. Add `light` to `<html>`.

<a id="theme-bridge"></a>
### A pragma card inside a dark strip stays light

The strip does not set Vanilla's theme toggles, or the card is not an outermost island root. Dark contexts must be Vanilla's (`is-dark`, `p-strip--dark`); a `.dark` class on the pragma root is ignored by design. For a region with no Vanilla theme context, set `color-scheme` from your `app` layer.

<a id="vanilla-inside"></a>
### Vanilla styling vanished inside a Modal, a Card, or another pragma container

That is the boundary doing its job. Vanilla content inside pragma territory is unsupported. Migrate the content first, or keep the container Vanilla until you can.

<a id="child-container"></a>
### A pragma component in a `.row` or an inline form lost its column or its inline placement

Vanilla lays out its containers' direct children with `> *` rules, and the boundary reverts them on a `.ds` root. Wrap the component in a plain element.

<a id="root-flip"></a>
### Everything Vanilla went missing across the whole page

`<html>` carries `ds`. That makes the whole document an island, and the boundary reverts every Vanilla rule in it. Remove it: the document is never an island while Vanilla is in the page (rule 10).

<a id="islands-plain"></a>
### Islands render in the browser's font, with no baseline and no pragma typography

The confined copy is not applying. Either the browser is below the `@scope` floor, where each block is dropped whole, or `elements.css` did not load: `adapter.css` imports it by relative path, so a pipeline that copies `adapter.css` on its own leaves it behind. Resolve the imports into one file, or keep the package's files together.

<a id="fonts"></a>
### Two font downloads, or a half-pixel baseline difference between pragma and Vanilla text

The two family names are still both declared. Follow rule 16. Vanilla's "Ubuntu variable" and pragma's "Ubuntu Sans" are the same typeface from two sources, so declaring one name from one set of files changes nothing visible except that both territories now share one set of metrics.

## Removal

Rule 19, in one change. The removal is complete when the `@layer vanilla` block is gone, this package is out of the manifest, and the page renders identically with `@canonical/styles` in place of this package's two imports.
