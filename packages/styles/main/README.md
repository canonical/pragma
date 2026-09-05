# @canonical/styles

The Canonical Design System's global stylesheet. One import brings in the reset, the typographic
engine, the design tokens, the modifier families and the layout presets, all of them in named cascade
layers, and all of the rules that select elements confined to the part of the page you mark as the
design system's.

This README is written for two readers: the person adding the design system to an application, and
the person maintaining this package. Where a claim can be checked by a test, the test is named.

## Installation

```bash
bun add @canonical/styles
```

## Usage

Import once, in your application's entry point:

```css
@import url("@canonical/styles");
```

Or from JavaScript or TypeScript:

```ts
import "@canonical/styles";
```

Then mark your root:

```html
<html class="ds app comfortable">
```

That single line is the root contract, and it has three parts.

| Class | What it means | Values |
| --- | --- | --- |
| `ds` | This subtree is the design system's. Its element-level rules apply inside it and nowhere else. | required |
| context | The kind of surface, which sets the comfortable/dense pair for every density value. | `app`, `site` or `docs` |
| density | Which of that pair is in force. | `comfortable` or `dense` |

A colour scheme is optional: `light` or `dark` pins one, and leaving both off lets the page follow the
reader's operating system. Nothing else belongs on the root.

`ds` does not have to be on `<html>`. Put it on a `<main>`, a section, or a single component's wrapper
and only that subtree becomes the design system's; the rest of the page is untouched. That is what
makes the package usable in an application that is still mostly built on something else. Every
component this system ships already carries `ds` on its own root, so a component dropped into any page
is its own small territory.

## Cascade layers

Everything this package ships is in a named layer, and the order is fixed by one statement, the first
rule of the stylesheet:

```css
@layer normalize, ds.tokens, ds.reset, ds.typography, ds.modifiers, ds.surfaces,
  ds.states, ds.components, ds.components.global, ds.components.app;
```

Read it from the bottom up — each position is an argument.

| Layer | What is in it | Why it sits where it does |
| --- | --- | --- |
| `normalize` | This package's own reset, scoped. | Lowest, because everything else is meant to overrule it. |
| `ds.tokens` | The primitive values, and the spacing, motion and overflow tokens. | Above the reset, because a token has to exist before anything reads it; below everything that reads one. |
| `ds.reset` | The declarations the marked root makes for itself: font, colour, line height, weight, text wrap, font smoothing, and border-box sizing for everything inside. | Above the tokens because it reads them; below the typographic engine and the components, which refine what it starts. |
| `ds.typography` | The semantic mapper and the baseline engine. | Above the reset because it is a more specific statement about text; below the modifiers, which can retune the scale. |
| `ds.modifiers` | Theme, the typographic scale, the intent families (anticipation, criticality, emphasis, importance) and their shims, and the context and density classes. | Above typography, because a modifier's job is to shift what the layers below produced. |
| `ds.surfaces` | The surface families: `surface`, `contrasted`, `modal`. | Above the modifiers, because a surface re-points colour channels the modifiers set. |
| `ds.states` | The derived hover, active and disabled channels. | Above the surfaces, because a state is derived from whatever the surface resolved to. |
| `ds.components` | The layout presets this package ships, and any component stylesheet that belongs to no tier. | Highest of the eight top-level layers, so a component is the final word on its own box. |
| `ds.components.global` | The stylesheets of the global component packages. | A sublayer of `ds.components`, named in the statement so that its order is fixed rather than left to whichever package a bundler emits first. |
| `ds.components.app` | The stylesheets of the application tiers. | Above the global sublayer, so an application tier arbitrating a component it also ships wins by layer rather than by load order. |

An order statement fixes the relative order of layers the first time they appear. A later statement
may introduce new names but can never reorder the ones already fixed, so an application that needs to
interleave a layer of its own puts its statement before this import.

The statement above, the table below and the list of what is deliberately
unlayered are not prose. `tests/layer-set.test.ts` reads them out of this file
and compares them against the stylesheet a bundler resolves, so a README that
disagrees with the CSS fails the build instead of misleading a reader.

### What is layered where

| File | Layer | Scoped to `.ds`? |
| --- | --- | --- |
| `normalize.css` | `normalize` | yes |
| `reset.css` | `ds.reset` | yes |
| `spacing.css` token block | `ds.tokens` | no |
| `spacing.css` content-flow container | `ds.components` | yes |
| `motion.css` | `ds.tokens` | no |
| `overflow.css` root default | `ds.tokens` | no |
| `overflow.css` `.surface` | `ds.surfaces` | no |
| `grid.css` layout presets | `ds.components` | yes |
| `modifiers.density.css` | `ds.modifiers` | no |
| `modifiers.states.shim.css`, `modifiers.importance.shim.css`, `modifiers.criticality.shim.css` | `ds.modifiers` | no |
| `controls.hover.shim.css` | `ds.surfaces` and `ds.states` | no |
| `@canonical/styles-typography` element rules | `ds.typography` | yes |
| `@canonical/styles-typography` token shims | `ds.tokens` and `ds.modifiers` | no |

Each generated design-token file opens a layer of its own; which one is in
[Design tokens](#design-tokens) below, and none of them is scoped, because they
declare custom properties and nothing else.

The scoped files are the ones whose rules select elements. The unscoped ones declare custom
properties, which do nothing until a rule reads them, and a rule that reads one is either scoped or
matches a design-system class.

### What is deliberately unlayered

Two kinds of rule, and the same reason covers both: the cascade does not sort
them, so putting them in a layer would say nothing and would only invite a reader
to look for the layer that "wins". The list is exhaustive — the contract test
fails on anything else outside a layer, and anything else outside a layer would
beat every layer in the table above.

| Rule | Where it is written, and why a layer would say nothing about it | Reaches this stylesheet |
| --- | --- | --- |
| `@font-face` | `fonts.css`. It defines a font for the whole document, not a style for an element, and it is a separate opt-in import (`@canonical/styles/fonts`) so that an application already serving the same files does not download them twice. | no |
| `@property` | `@canonical/styles-typography`. It registers what the baseline unit means for the whole document. | no |

Neither reaches the stylesheet `@canonical/styles` resolves to, for two
different reasons. The fonts are a separate entry point, by design. The one
`@property` registration the design system writes today is `--baseline-height`,
and browsers reject it: an `initial-value` has to be computationally independent
and this one is in `rem`, which is not. That is a known defect, recorded beside
the registration itself (`baseline-shim.css`) and not fixed there because a fix
changes what an application that never sets `--baseline-height` renders. Nothing
in the design system relies on the fallback. When it is fixed the registration
will start appearing here, and the contract test will say so by failing on this
table.

### Why the element-level layers are scoped

`normalize` and `ds.reset` here — and `ds.typography` in the typography package — are written inside
`@scope (.ds)` blocks. That keeps their rules inside the subtree you marked, which matters for two
reasons.

A page that is not entirely the design system's has other rules on its bare elements. If this
package's reset applied to the whole document it would restyle them, and no layer ordering could stop
it, because the two systems disagree about the same `<p>`. Confining the rules to the marked subtree
means the question never arises: each element has exactly one owner.

And the confinement is written where the rules are, not applied to them afterwards. Nothing in this
package is transformed between what a contributor writes and what the browser runs. A block that says
`@scope (.ds)` once is also what a contributor who does nothing special will get right on the next
rule they add.

A scoped selector never matches its own scoping root, so a rule that has to reach the root itself is
written `:where(:scope)`. That is the marked element: the document element in an application that is
the design system's throughout, a region or a single component in one that is not.

## What this package guarantees

| Guarantee | The check behind it |
| --- | --- |
| Every rule the package ships is in one of the ten declared layers, and the statement is the first rule of the stylesheet. | `tests/layer-set.test.ts`, which resolves this package's entry through Vite and walks the result's CSSOM in Chromium: the statement first, every layer opened one of the ten or a sublayer of one, none anonymous, and nothing at the top level that a layer could have sorted. The order fixtures in `@canonical/styles-vanilla-adapter` (`packages/styles/vanilla-adapter/tests/order.test.ts`) check the same statement from the other side of the boundary. |
| An application tier's rule for a component beats the global tier's rule for the same component, whichever of the two a bundler loads first. | The two sublayers are named in the statement, so their order is fixed there rather than at first appearance. `tests/layer-set.test.ts` reads the statement back and asserts that these two are the only declared layers nothing writes to; the component packages move into them in step F-4 of the cascade programme, and until then the guarantee is vacuous. |
| The package ships no `!important`. | `tests/layer-set.test.ts`, over the resolved stylesheet. An important declaration inverts the layer order and cannot be arbitrated, so one of them would undo the guarantee above. |
| Inside a marked subtree, every element computes as it does on a page that is the design system's throughout — the same font, size, weight, line height, colour, box sizing, font smoothing and text wrapping. | The computed-style fixtures in `packages/styles/vanilla-adapter/tests/territory.test.ts`, which render the same block of markup on both kinds of page and compare every longhand on every element. |
| The marked root declares its own baseline rather than inheriting the host page's. | The fixture named `inherits pragma's baseline at the root, not Vanilla's`, in the same file. |
| Nothing this package ships restyles a bare element outside a marked subtree. | `packages/styles/vanilla-adapter/tests/vanilla-territory.test.ts`, which compares a page that loads this stylesheet against the same page without it, `html` and `body` included. |
| A reader who asks their system for less motion gets no motion from anything reading the motion tokens. | The reduced-motion fixture in `territory.test.ts`. Components that hard-code a duration instead of reading a token are being moved onto the tokens separately (step F-6). |

## What this package does not guarantee

- **Unlayered application CSS beats every rule here.** That is how the cascade is defined: a rule in no
  layer outranks a rule in any layer. It is not a defect, and it is the escape hatch — but it also
  means an application that wants this package's layer order to hold for its own CSS has to put that
  CSS in a layer too. See "Migrating" below.
- **`!important` in application or third-party CSS beats every rule here**, and for important
  declarations the layer order runs backwards, so the lowest layer wins. Nothing this package can do
  changes that.
- **Below the browser floor, the scoped layers do not apply at all.** A browser that does not
  understand `@scope` drops the whole block: components stay styled, the reset and the typographic
  engine do not apply, and text falls back to the browser's own defaults.

### Browser floor

| Feature | Used by | Chrome | Safari | Firefox |
| --- | --- | --- | --- | --- |
| `@scope` | this package's reset, the typography engine | 118 | 17.4 | 146 |
| `mod()` | the baseline engine | 125 | 17.4 | 128 |
| `@property` | the baseline engine | 85 | 16.4 | 128 |

The design system targets current browsers and does not carry compatibility shims for older ones. An
application that cannot move should pin a version.

## Migrating to the layered release

This release makes three changes that an application has to answer.

1. **Add `ds` to your root**, beside the context and density classes you already have:
   `<html class="ds app comfortable">`. Without it the reset and the typographic engine apply nowhere,
   because they are now confined to the marked subtree. Components keep working — they carry `ds`
   themselves — but the page's text will fall back to the browser's defaults.

2. **Your unlayered CSS now beats every rule in this package.** Before this release most of what the
   package shipped was unlayered too, so your overrides competed with it by source order and
   specificity, and sometimes lost. They no longer can. If you were relying on a rule of ours to win,
   it will not any more.

3. **Put your own CSS in a layer, or accept that it wins.** Either is a valid choice, and the second
   needs no work. To take the first, wrap your application's stylesheet and name your layer after the
   package's own:

   ```css
   @layer normalize, ds.tokens, ds.reset, ds.typography, ds.modifiers,
     ds.surfaces, ds.states, ds.components, ds.components.global,
     ds.components.app, app;
   @import url("@canonical/styles");

   @layer app {
     /* your CSS */
   }
   ```

   Your statement comes first and fixes `app` above every design-system layer, so your rules win by
   layer rather than by accident of order — and a rule of yours that you later want overridden by a
   component can simply be moved down.

Two things that used to be true and are not:

- The `normalize.css` package is no longer a dependency. This package writes its own reset, so it can
  be scoped, and so that it contains only the rules the design system actually relies on. If your
  application imported `normalize.css` through us and wants the rest of it, depend on it directly.
- The old README said component styles override modifier styles "regardless of source order". They did
  not: the layers were declared but almost nothing was written into them. They do now.

## Design tokens

These generated files from `@canonical/design-tokens` are imported by the entry.
Each opens its own layer, and the four layer names the generator emits —
`ds.tokens`, `ds.modifiers`, `ds.surfaces`, `ds.states` — are part of this
package's cascade contract, not that package's private business: they are four of
the ten names in the statement, and `tests/layer-set.test.ts` checks each file
against the layer this table gives it. A generator that renamed one would fail
here.

| Token set | Contents | Layer it opens |
| --- | --- | --- |
| `sets.primitive` | Base colour palette, spacing scale, font sizes | `ds.tokens` |
| `modifiers.theme` | Light/dark theme mappings | `ds.modifiers` |
| `modifiers.surfaces` | Surface elevation tokens | `ds.surfaces` |
| `modifiers.anticipation` | Constructive/destructive/caution intents | `ds.modifiers` |
| `modifiers.criticality` | Error/warning/success/information states | `ds.modifiers` |
| `modifiers.emphasis` | Branded/highlighted/muted emphasis | `ds.modifiers` |
| `states` | Interactive state tokens (hover, active, focus, disabled) | `ds.states` |

`modifiers.importance` is generated but not imported. The file is a header
comment and nothing else — no rule, no layer — so importing it added a name to
the graph and nothing to the page. `modifiers.importance.shim.css` supplies the
importance channels meanwhile, in `ds.modifiers`, where the rest of the modifier
family lives. The import comes back in the `@canonical/design-tokens` release
that emits the importance modifiers with content; until then the contract test
holds both halves in place, by failing if that file stops being empty and by
failing if any file the entry does import contributes no rule.

The typography engine imports one more generated file of its own,
`modifiers.typography.css`, which is why `@canonical/styles-typography` appears
in the layer table as opening `ds.modifiers` as well as its own two layers.

## Dependencies

| Package | Role |
| --- | --- |
| `@canonical/design-tokens` | CSS custom properties for colour, spacing, and states |
| `@canonical/styles-typography` | Baseline grid engine and typographic scale |

## Package structure

```
src/
  index.css                       -- entry point: the layer statement, then the imports
  normalize.css                   -- this package's own reset, scoped
  reset.css                       -- the marked root's baseline, scoped
  spacing.css                     -- spacing tokens, and the content-flow container
  motion.css                      -- motion tokens, and reduced motion
  overflow.css                    -- scroll overflow affordance
  grid.css                        -- layout presets, scoped
  modifiers.density.css           -- the context x density family
  modifiers.*.shim.css            -- temporary shims for unfinished generated modifiers
  controls.hover.shim.css         -- temporary shim for control selected/hover channels
  fonts.css                       -- opt-in @font-face, unlayered
tests/
  layer-set.test.ts               -- the cascade contract, checked in a browser
  support/cascade.ts              -- the CSSOM walks and the README's tables
```
