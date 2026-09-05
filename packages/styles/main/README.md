# @canonical/styles

This README is written for two readers: the person adding the design system to an application, and the
person maintaining this package. Where a claim can be checked by a test, the test is named.

The Canonical Design System's global stylesheet. One import brings in the reset, the typographic
engine, the design tokens, the modifier families and the layout presets. Everything this package itself
ships is in a named cascade layer, and the rules that select elements are confined to the part of the
page you mark as the design system's. The typographic engine, which lives in
`@canonical/styles-typography` and is released with this package, is layered and scoped the same way.

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

Only `ds` has to be on the territory root. The context and density classes set custom properties, which
inherit, so they may sit on the same element or on any ancestor of the components that read them — the
reference application puts `ds` on `<html>` and `app comfortable` on `<body>`.

A colour scheme is optional: `light` or `dark` pins one, and leaving both off lets the page follow the
reader's operating system. Nothing else belongs on the root.

**In an application that is the design system's throughout, mark `<html>`.** That is the shape. `<body>`
is a fallback where you cannot reach the document element: it puts the body inside the territory, so
the page margin is reset as before, but it leaves `<html>` outside, and a control's chrome derives from
the root's font metrics — measured, an input's line height moves from 20px to 21px.

But `ds` does not have to be at the top. Put it on a `<main>`, a section, or a single component's
wrapper and only that subtree becomes the design system's; the rest of the page is untouched. That is
what makes the package usable in an application that is still mostly built on something else — with the
one consequence that the body is then outside the territory, so the browser's 8px page gutter stays and
you zero it yourself.

Every component this system ships carries `ds` on its own root — except three work-in-progress grid
components, `GridCard`, `SettingsView` and `ApplicationLayout`, which gain it when the component
stylesheets are wrapped in their tier layers — so a component dropped into any page is its own small
territory. Only the outermost
`ds` in a subtree acts as a territory root: a component inside another one inherits from its container
rather than resetting to the baseline.

**An application that still runs another CSS framework marks its root differently**, and needs one more
package: `@canonical/styles-vanilla-adapter`, which keeps the two systems out of each other's territory
and bridges the theme signal between them. Its root carries the context, the density and `light` from
day one and **not** `ds`, which goes on only at the last step of the migration, when nothing of the
other framework is left. The paragraph above about leaving the colour scheme off is for an application
that is the design system's throughout; during coexistence the root stays pinned `light`, because the
other framework does not read `color-scheme` and would stay light around dark components. That
package's README is the reference for all of it.

## Cascade Layers

Everything this package itself ships is in a named layer, and the order is fixed by one statement, the
first rule of this stylesheet. The typographic engine, which this package imports, is layered and
scoped the same way, and is released with it:

```css
@layer normalize, ds.tokens, ds.reset, ds.typography, ds.modifiers, ds.surfaces,
  ds.states, ds.components, ds.components.global, ds.components.app;
```

Read it from the bottom up — each position is an argument.

| Layer | What is in it | Why it sits where it does |
| --- | --- | --- |
| `normalize` | This package's own reset, scoped. | Lowest, because everything else is meant to overrule it. |
| `ds.tokens` | The primitive values, the spacing, motion and overflow tokens, and the typography mapper's naming shims. | Above the reset, because a token has to exist before anything reads it; below everything that reads one. |
| `ds.reset` | The declarations the outermost marked root makes for itself: font, colour, line height, weight, text-wrap style, font smoothing — and border-box sizing for it and everything inside. | Above the tokens because it reads them; below the typographic engine and the components, which refine what it starts. |
| `ds.typography` | The semantic mapper and the baseline engine, from `@canonical/styles-typography`. | Above the reset because it is a more specific statement about text; below the modifiers, which can retune the scale. |
| `ds.modifiers` | Theme, the typographic scale, the intent families (anticipation, criticality, emphasis, importance) and their shims, and the context and density classes. | Above typography, because a modifier's job is to shift what the layers below produced. |
| `ds.surfaces` | The surface families: `surface`, `contrasted`, `modal`. | Above the modifiers, because a surface re-points colour channels the modifiers set. |
| `ds.states` | The derived hover, active and disabled channels. | Above the surfaces, because a state is derived from whatever the surface resolved to. |
| `ds.components` | Nothing, by rule. It is the parent of the two tiers below and holds no rule of its own. | Highest of the eight top-level layers, so a component is the final word on its own box. A rule written *directly* into a parent layer sits in that layer's implicit final sublayer, which is above every named sublayer — so such a rule would outrank both tiers and no component package could override it by layer. Everything this package puts in `ds.components` therefore sits in a tier. |
| `ds.components.global` | The stylesheets of the global component packages, and this package's own layout presets and content-flow container. | A sublayer of `ds.components`, named in the statement so that its order is fixed rather than left to whichever package a bundler emits first. |
| `ds.components.app` | The stylesheets of the application tiers. | Above the global sublayer, so an application tier arbitrating a component it also ships wins by layer rather than by load order — including over one of the layout presets. |

An order statement fixes the relative order of layers the first time they appear. A later statement
may introduce new names but can never reorder the ones already fixed, so an application that needs to
interleave a layer of its own puts its statement before this import.

### What Is Layered Where

| File | Layer | Scoped to `.ds`? |
| --- | --- | --- |
| `normalize.css` | `normalize` | yes |
| `reset.css` root declarations | `ds.reset` | yes |
| `reset.css` box-sizing | `ds.reset` | yes, written `:where(.ds, .ds *)` rather than with `@scope` — see below |
| `spacing.css` token block | `ds.tokens` | no |
| `spacing.css` content-flow container | `ds.components.global` | yes |
| `motion.css` | `ds.tokens` | no |
| `overflow.css` root default | `ds.tokens` | no |
| `overflow.css` `.surface` | `ds.surfaces` | no |
| `grid.css` layout presets | `ds.components.global` | yes |
| `grid.css` `:root` defaults | `ds.components.global` | no — component-scoped tokens stay with the rules that read them |
| `modifiers.density.css` | `ds.modifiers` | no |
| `modifiers.states.shim.css`, `modifiers.importance.shim.css`, `modifiers.criticality.shim.css` | `ds.modifiers` | no |
| `controls.hover.shim.css` | `ds.surfaces` and `ds.states` | no |
| `@canonical/styles-typography` | `ds.tokens` for the mapper's naming shims, `ds.typography` for every element rule, `ds.modifiers` for the typographic scale it re-exports | the `ds.typography` rules, yes; the shims, no |
| `@canonical/design-tokens` distribution files | `ds.tokens`, `ds.modifiers`, `ds.surfaces`, `ds.states` — each file opens its own, except `modifiers.importance.css`, which is empty and opens none | no |

The scoped files are the ones whose rules select elements. The unscoped ones are almost all custom
properties, which do nothing until a rule reads them, and a rule that reads one is either scoped or
matches a design-system class. Two exceptions, both deliberate and both in files this package imports
rather than writes:

- **`modifiers.theme.css` sets `color-scheme`** — `light dark` on `:root`, `light` on `.light`, `dark`
  on `.dark` — unscoped and document-wide. That is the point of it: the colour scheme is what every
  `light-dark()` token resolves against, including the browser's own form controls and scrollbars, and
  it has to reach them. It is the one property this package sets outside a marked subtree.
- **`states.css` derives its state channels on `*`** — thirty custom properties on every element. It
  stays unscoped: it is a generated file this package cannot author a scope into, it declares nothing
  but custom properties, and scoping it was measured to cost more than it saves on a page that is the
  design system's throughout (the same elements match either way, plus the scope check).

### What Is Deliberately Unlayered

Two things. Each is declared exactly once, here and nowhere else, so no layer has anything to order it
against and putting either in a layer would change no computed value. Both apply document-wide
wherever they are written. Keeping them at the top level, beside the other declarations of their kind,
is a convention that makes them easy to find rather than something the cascade requires: layers do
sort duplicate `@font-face` rules and duplicate `@property` registrations, measured in Chromium 151
and Firefox 153 — there simply are no duplicates here.

- **`@font-face`**, in `fonts.css`. It defines a font for the whole document, not a style for an
  element. The file is opt-in and imported separately so that an application already serving the same
  files does not download them twice.
- **The `@property` registration** of `--baseline-height`, in `@canonical/styles-typography`. It fixes
  the type, the inheritance and the initial value of one custom property for the whole document. That
  package's README carries the measurement.

### Why the Element-Level Layers Are Scoped

`normalize` and `ds.reset` here, and `ds.typography` in the typography package, are written inside
`@scope (.ds)` blocks. That keeps their rules inside the
subtree you marked, which matters for two reasons.

A page that is not entirely the design system's has other rules on its bare elements. If this
package's reset applied to the whole document it would restyle them, and no layer ordering could stop
it, because the two systems disagree about the same `<p>`. Confining the rules to the marked subtree
means the question never arises: each element has exactly one owner.

And the confinement is written where the rules are, not applied to them afterwards. Nothing in this
package is transformed between what a contributor writes and what the browser runs. A block that says
`@scope (.ds)` once is also what a contributor who does nothing special will get right on the next
rule they add.

A scoped selector never matches its own scoping root, so a rule that has to reach the root itself names
`:scope`. The baseline declarations name it as `:where(:scope:not(.ds *))` — the *outermost* marked
element, and only that one. Every component carries `ds` on its own root, so each of them opens a scope
of its own; without the qualifier the baseline would land on every component and a component inside a
coloured container would reset to the baseline colour instead of inheriting the container's. A rule
that has to reach an element wherever it sits, including one that is itself the root, names both:
`:where(:scope, :scope *)`.

One rule takes the long form instead: the border-box declaration in `reset.css`, written
`:where(.ds, .ds *)` in the same layer. It is the only rule in the package with universal reach, so
every element in the tree is a candidate for it and each candidate would pay a scope-activation check;
measured on a 10,000-element page that cost about 135 ms of a 200 ms style-recalc regression. The match
set, the specificity and the layer are identical either way.

## What This Package Guarantees

| Guarantee | The check behind it |
| --- | --- |
| Every rule the package itself ships is in one of the ten declared layers, and the statement is the first rule of this stylesheet. The typographic engine it imports is in them too. | The order fixtures that arrive with the Vanilla adapter package read the statement out of the resolved stylesheet and check every layer name the package opens against it. A check inside this package — that the set of layers used equals the set declared — is being added separately. |
| An application tier's rule for a component beats the global tier's rule for the same component, whichever of the two a bundler loads first. | The two sublayers are named in the statement, so their order is fixed there rather than at first appearance, and the same order fixture reads it back. The component packages move into them when their stylesheets are wrapped, which is a separate change; until then both sublayers are empty and the guarantee is vacuous. |
| The package ships no `!important`. | The same fixture file. An important declaration inverts the layer order and cannot be arbitrated by layers at all, so one of them would undo the guarantee above. |
| Under `prefers-reduced-motion: reduce`, every motion duration this package defines is `0s`. | `src/motion.css`, and the reduced-motion fixture arriving with the adapter package. Zeroing the token is the mechanism: a component reads the token, so nothing has to out-rank the component's own declaration. Whether a given component honours the tokens is that package's guarantee, not this one's. Sheets that still hard-code a duration, and so still animate under the preference, are being moved onto the tokens separately: in the form package the shared input chrome (`src/index.css`) and eight component sheets (`ChoicesField`, `RichChoicesField`, `CheckboxInput`, `RadioInput`, `ColorInput`, `ComboboxInput` and its list, `FileUploadInput`, `SwitchInput`); in the global package `Tooltip`, `ContextualMenu` and `Popover`, which set their own duration property; and one application-tier sheet, the launchpad diff viewer's file header. |
| Inside a marked subtree, every element computes as it does on a page that is the design system's throughout — the same font, size, weight, line height, colour, box sizing, font smoothing and text wrapping. | The computed-style fixtures arriving with the adapter package, which render the same block of markup on both kinds of page and compare every longhand on every element. |
| The outermost marked root declares its own baseline rather than inheriting the host page's, and everything inside it inherits from there. | The fixture named `inherits pragma's baseline at the root, not Vanilla's`, in the same file. |
| Apart from `color-scheme` on the document root, nothing this package ships restyles a bare element outside a marked subtree. | The fixture that compares a page which loads this stylesheet against the same page without it, `html` and `body` included — at two viewport widths and against two versions of the other framework. |

## What This Package Does Not Guarantee

- **Unlayered application CSS beats every rule here.** That is how the cascade is defined: a rule in no
  layer outranks a rule in any layer. It is not a defect, and it is the escape hatch — but it also
  means an application that wants this package's layer order to hold for its own CSS has to put that
  CSS in a layer too. See "Migrating" below.
- **`!important` in application or third-party CSS beats every rule here**, and for important
  declarations the layer order runs backwards, so the lowest layer wins. Nothing this package can do
  changes that.
- **The body's page margin is only reset when the body is inside the marked subtree.** `ds` on `<html>`
  or on `<body>` gets it; a marked `<main>` or wrapper does not, and there the browser's 8px page gutter
  stays. Zero it yourself, or mark higher up.
- **`color-scheme` is set on the document root wherever this stylesheet is loaded**, marked subtree or
  not, because that is what the `light-dark()` tokens and the browser's own controls resolve against.
- **Below the browser floor, the scoped layers do not apply at all.** A browser that does not
  understand `@scope` drops the whole block. That is the reset, the layout presets `grid`, `subgrid`,
  `responsive`, `intrinsic` and `content-flow`, and the typographic engine's element rules. Three
  shipped components carry a preset on their own root (`ds cards subgrid`, `ds form subgrid`,
  `ds content-layout grid`), so below the floor the failure is a collapsed layout, not only default
  text. Component styles themselves are unaffected.

### Browser Floor

| Feature | Used by | Chrome | Safari | Firefox |
| --- | --- | --- | --- | --- |
| `@scope` | this package's reset, the layout presets, the typography engine | 118 | 17.4 | 146 |
| `mod()` | the baseline engine | 125 | 17.4 | 128 |
| `@property` | the baseline engine's `--baseline-height` registration | 85 | 16.4 | 128 |

The typographic engine also needs the `cap` unit and `round()`; `@canonical/styles-typography`'s
"Browser Support" section is the full table for it.

The design system targets current browsers and does not carry compatibility shims for older ones. An
application that cannot move should pin a version.

## Migrating to the Layered Release

This release makes three changes that an application has to answer.

1. **Add `ds` to your root**, beside the context and density classes you already have:
   `<html class="ds app comfortable">`. Without it the reset applies nowhere, because it is now
   confined to the marked subtree. Components keep working — every one of them carries `ds` itself,
   bar the three work-in-progress grid components named above — but the page's text falls back to the
   browser's defaults.

   Mark `<html>` if you can, or `<body>`: both put the body inside the territory, so its page margin is
   reset as before. A root further in leaves the body outside, and the browser's 8px page gutter comes
   back for you to zero.

   The layout presets move with the reset. `grid`, `subgrid`, `responsive`, `intrinsic` and
   `content-flow` now apply only inside a marked subtree, so a page that used one of those class names
   on an element with no `ds` ancestor loses it — a `grid responsive` container outside the territory
   computes `display: block`. That is the point of the scoping (the names are common enough that a page
   the design system does not own may use them for something else), but it is a layout change, not a
   typographic one.

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

If you import a subpath rather than the package entry — `@canonical/styles/spacing.css` and the four
other subpaths this package exports — note that a subpath carries no order statement, so the layers it
opens are ordered by wherever they first appear in your own stylesheet, and `spacing.css` now brings a
`@scope (.ds)` block with it. Import the entry point unless you have a reason not to.

### What Moves on the Page

Measured in Chromium, an application that is the design system's throughout, before against after with
`ds` added to the root. Four things change on every element, and one on `<hr>`; nothing else does.

| What | Before | After | Why |
| --- | --- | --- | --- |
| `line-height`, everywhere it was not set | `1.15` inherited from the old reset | `normal` | the marked root declares its own baseline |
| `color`, everywhere it was not set | `rgb(0, 0, 0)` | `oklch(0 0 0)` | the root declares `var(--color-text)`: the same black in the light scheme, but it now follows the theme instead of being the browser's default |
| `box-sizing`, everywhere | `content-box` | `border-box` | the components are authored against it |
| `font-family` on `<html>` | the browser's serif | the token stack | the root declares the font; `<body>` already had it from the typographic mapper |
| `overflow` on `<hr>` | `visible` | `hidden` | the browser's own value; a rule has no content to overflow, so nothing shows |

Two things that used to be true and are not:

- The `normalize.css` package is no longer a dependency. This package writes its own reset, so it can
  be scoped, and so that it contains only the rules the design system actually relies on. If your
  application imported `normalize.css` through us and wants the rest of it, depend on it directly.
- The old README said component styles override modifier styles "regardless of source order". They did
  not: the layers were declared but almost nothing was written into them. They do now.

## Design Tokens

The following token sets from `@canonical/design-tokens` are included:

| Token set | Contents | Layer it opens |
| --- | --- | --- |
| `sets.primitive` | Base colour palette, spacing scale, font sizes | `ds.tokens` |
| `modifiers.theme` | Light/dark theme mappings, and `color-scheme` on the document root | `ds.modifiers` |
| `modifiers.surfaces` | Surface elevation tokens | `ds.surfaces` |
| `modifiers.anticipation` | Constructive/destructive/caution intents | `ds.modifiers` |
| `modifiers.criticality` | Error/warning/success/information states | `ds.modifiers` |
| `modifiers.emphasis` | Branded/highlighted/muted emphasis | `ds.modifiers` |
| `modifiers.importance` | Primary/secondary importance levels — the generated file is empty today, so the shipped mapping is this package's own shim, and a stacked change drops the import until the generated file has content | none |
| `modifiers.typography` | The typographic scale, through `@canonical/styles-typography` | `ds.modifiers` |
| `states` | Interactive state tokens (hover, active, focus, disabled) | `ds.states` |

## Dependencies

| Package | Role |
| --- | --- |
| `@canonical/design-tokens` | CSS custom properties for colour, spacing, and states |
| `@canonical/styles-typography` | Baseline grid engine and typographic scale |

## Package Structure

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
```
