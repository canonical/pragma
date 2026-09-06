# @canonical/styles

This README is written for two readers: the person adding the design system to an application, and the
person maintaining this package. Where a claim can be checked by a test, the test is named.

The Canonical Design System's global stylesheet. One import brings in the reset, the typographic
engine, the design tokens, the modifier families and the layout presets. Everything this package
itself ships is in a named cascade layer, and its element-level rules style the whole page, as a
reset does — nothing is confined and nothing has to be marked. The typographic engine, in
`@canonical/styles-typography` and released with this package, is layered the same way.

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

Then declare the surface on your root:

```html
<html class="app comfortable">
```

That single line is the root contract, and it has two parts.

| Class | What it means | Values |
| --- | --- | --- |
| context | The kind of surface, which sets the comfortable/dense pair for every density value. | `app`, `site` or `docs` |
| density | Which of that pair is in force. | `comfortable` or `dense` |

A colour scheme is optional: `light` or `dark` pins one, and leaving both off lets the page follow the
reader's operating system. Nothing else belongs on the root — in particular there is no class that
switches the reset on. It applies because the stylesheet is loaded.

Both classes set custom properties, which inherit, so they may sit on the document element or on any
ancestor of the components that read them — the reference application puts `app comfortable` on
`<body>`.

`ds` is not a root class and never has been. It is what every component puts on its own root, so that
a component rule can select `.ds.button` rather than `.button` and cannot collide with a page's own
class names.

**A page that also runs another CSS framework** cannot let this stylesheet restyle the half it has not
migrated, and that is what `@canonical/styles-vanilla-adapter` is for: it ships a copy of this
package's three element-level layers confined to the parts a team has handed over, keeps the two
systems out of each other's way, and bridges the theme signal between them. A test in that package
binds its copy to the files here so the two cannot drift. Nothing about that arrangement changes this
package or the markup of a page that does not need it.

### Taking it without the element rules

`@canonical/styles/core.css` is this stylesheet without a single rule that selects an element. Four
files supply those, and none of them is in `core.css`: `normalize.css`, the root baseline in
`reset.css`, the typographic engine, and the element rules that apply the typographic mapping
(`@canonical/styles-typography/mapper.elements.css`). Everything else is there, including the other half of
that mapping — the naming shims, the typographic scale and the `--baseline-height` registration —
which declares custom properties and styles nothing, so a host supplying its own element rules finds
the values they need already declared.

There is one such host today. A page that also runs another CSS framework loads the coexistence
adapter, which ships its own copy of those four files, confined to the part of the page the design
system owns, and loads `core.css` rather than `index.css` so the element rules arrive once and
confined. A page that does not run another framework imports `index.css` and gets everything; that is
the ordinary case. `tests/core.test.ts` holds both halves of the contract: that the two entry points
open the same layer order statement, and that the resolved `core.css` opens no `normalize`,
`ds.reset` or `ds.typography` block and contains no rule with a tag-name selector or one of the
engine's classes.

## Cascade Layers

Everything this package itself ships is in a named layer, and the order is fixed by one statement, the
first rule of this stylesheet. The typographic engine, which this package imports, is in the same
layers:

```css
@layer normalize, ds.tokens, ds.reset, ds.typography, ds.modifiers, ds.surfaces,
  ds.states, ds.components, ds.components.global, ds.components.app;
```

Read it from the bottom up — each position is an argument.

| Layer | What is in it | Why it sits where it does |
| --- | --- | --- |
| `normalize` | This package's own reset. | Lowest, because everything else is meant to overrule it. |
| `ds.tokens` | The primitive values, the spacing, motion and overflow tokens, and the typography package's naming shims. | Above the reset, because a token has to exist before anything reads it; below everything that reads one. |
| `ds.reset` | The declarations the document root makes for itself: font, colour, line height, weight, text wrapping, font smoothing — and border-box sizing for it and everything inside. | Above the tokens because it reads them; below the typographic engine and the components, which refine what it starts. |
| `ds.typography` | The rules that apply the semantic typography mapping to elements, and the baseline engine, from `@canonical/styles-typography`. | Above the reset because it is a more specific statement about text; below the modifiers, which can retune the scale. |
| `ds.modifiers` | Theme, the typographic scale, the intent families (anticipation, criticality, emphasis, importance) and their shims, and the context and density classes. | Above typography, because a modifier's job is to shift what the layers below produced. |
| `ds.surfaces` | The surface families: `surface`, `contrasted`, `modal`. | Above the modifiers, because a surface re-points colour channels the modifiers set. |
| `ds.states` | The derived hover, active and disabled channels. | Above the surfaces, because a state is derived from whatever the surface resolved to. |
| `ds.components` | Nothing, by rule. It is the parent of the two tiers below and holds no rule of its own. | Highest of the eight top-level layers, so a component is the final word on its own box. A rule written *directly* into a parent layer sits in that layer's implicit final sublayer, which is above every named sublayer — so such a rule would outrank both tiers and no component package could override it by layer. Everything this package puts in `ds.components` therefore sits in a tier. |
| `ds.components.global` | The stylesheets of the global component packages, and this package's own layout presets and content-flow container. | A sublayer of `ds.components`, named in the statement so that its order is fixed rather than left to whichever package a bundler emits first. |
| `ds.components.app` | The stylesheets of the application tiers. | Above the global sublayer, so an application tier arbitrating a component it also ships wins by layer rather than by load order — including over one of the layout presets. |

An order statement fixes the relative order of layers the first time they appear. A later statement
may introduce new names but can never reorder the ones already fixed, so an application that needs to
interleave a layer of its own puts its statement before this import.

The statement above, the tables below and the list of what is deliberately
unlayered are not prose. `tests/layer-set.test.ts` reads them out of this file and
compares them against the stylesheet a bundler resolves, so a README that
disagrees with the CSS fails the build instead of misleading a reader.

What the test binds is one answer per file and per layer. A file may appear twice
when it writes to two layers — `spacing.css` puts its tokens in one and its
container rule in another — and it is then checked on the union of its rows. No
file has two rows for the same layer, because the test could only read the
disjunction of two answers to one question; where a file needs two things said
about one layer, the row says both. Reordering rows changes nothing a browser can
see, and the test says nothing about it.

### What Is Layered Where

| File | Layer | Selects elements? |
| --- | --- | --- |
| `normalize.css` | `normalize` | yes |
| `reset.css` root declarations | `ds.reset` | yes |
| `reset.css` box-sizing | `ds.reset` | yes — `*`, `::before`, `::after` |
| `spacing.css` token block | `ds.tokens` | no |
| `spacing.css` content-flow container | `ds.components.global` | yes |
| `motion.css` | `ds.tokens` | no |
| `overflow.css` root default | `ds.tokens` | no |
| `overflow.css` `.surface` | `ds.surfaces` | no |
| `grid.css` | `ds.components.global` | yes — the layout presets; the `:root` block beside them declares only the tokens those presets read, kept with them rather than moved to `ds.tokens` |
| `modifiers.density.css` | `ds.modifiers` | no |
| `modifiers.states.shim.css`, `modifiers.importance.shim.css`, `modifiers.criticality.shim.css` | `ds.modifiers` | no |
| `controls.hover.shim.css` | `ds.surfaces` and `ds.states` | no |
| `@canonical/styles-typography` element rules | `ds.typography` | yes |
| `@canonical/styles-typography` naming shims and scale | `ds.tokens` and `ds.modifiers` | no |

Each generated `@canonical/design-tokens` file opens a layer of its own, and
which one is in [Design Tokens](#design-tokens) below, with the same
selects-elements answer this table gives. One of them answers yes, for the reason
under the table.

The files marked yes are the ones the adapter's confined copy has to mirror. The rest are almost all
custom properties, which do nothing until a rule reads them, and a rule that reads one matches a
design-system class. Two exceptions, both deliberate and both in files this package imports
rather than writes:

- **`modifiers.theme.css` sets `color-scheme`** — `light dark` on `:root`, `light` on `.light`, `dark`
  on `.dark` — document-wide. That is the point of it: the colour scheme is what every
  `light-dark()` token resolves against, including the browser's own form controls and scrollbars, and
  it has to reach them.
- **`states.css` derives its state channels on `*`** — thirty custom properties on every element. It
  is a generated file this package does not author, and it declares nothing but custom properties, so
  its universal selector costs a page nothing it would not pay anyway.

### What Is Deliberately Unlayered

Two things. Each is declared exactly once, here and nowhere else, so no layer has anything to order it
against and putting either in a layer would change no computed value. Both apply document-wide
wherever they are written. Keeping them at the top level, beside the other declarations of their kind,
is a convention that makes them easy to find rather than something the cascade requires: layers do
sort duplicate `@font-face` rules and duplicate `@property` registrations, measured in Chromium 151
and Firefox 153 — there simply are no duplicates here, and the test in this package checks that the import graph keeps it that way.

| Rule | Where it is written, and why a layer would say nothing about it | Reaches this stylesheet |
| --- | --- | --- |
| `@font-face` | `fonts.css`. It defines a font for the whole document, not a style for an element. The file is opt-in and imported separately (`@canonical/styles/fonts`) so that an application already serving the same files does not download them twice. | no |
| `@property` | `@canonical/styles-typography`. The registration of `--baseline-height` fixes the type, the inheritance and the initial value of one custom property for the whole document. That package's README carries the measurement. | yes |

The last column is the one worth checking, and `tests/layer-set.test.ts` checks it
both ways: nothing sits outside a layer that this table does not name, and
everything the table says reaches the stylesheet is found there. The fonts do not,
because they are a separate entry point. The registration does — it travels with
the mapper, so both entry points carry it — and that is not a formality. An
earlier version of it gave `--baseline-height` an `initial-value` in `rem`, which
is not computationally independent, so browsers threw the whole registration away
and the fallback it promised did not exist. Nothing said so. Asserting that the
registration is *present* in the resolved stylesheet is what makes that failure
visible the next time.

### Where the Element-Level Rules Apply

To the whole page. Three of the layers select elements rather than declare custom properties —
`normalize`, `ds.reset` and `ds.typography` — and they apply the way
a reset always has: the stylesheet is loaded, so the rules are in force. There is no marker to add and
no subtree to nominate.

That is a deliberate ruling, not an oversight. An earlier draft of this release confined those layers
to a marked subtree so that a page running two CSS frameworks could keep them apart. The confinement
works, but it made every ordinary page pay for a problem only some pages have: a class on the root, a
browser floor it did not need, and a reset that silently did nothing if the class was forgotten.

The problem is real, so it is solved where it belongs. `@canonical/styles-vanilla-adapter` ships a
confined copy of these three layers, applying only inside the parts of a page a team has handed over,
and a test in that package binds the copy to the files here so the two cannot drift. A page that needs
it installs it; a page that does not never hears about it.

## What This Package Guarantees

| Guarantee | The check behind it |
| --- | --- |
| Every rule the package itself ships is in one of the ten declared layers, and the statement is the first rule of this stylesheet. The typographic engine it imports is in them too. | `tests/layer-set.test.ts`, which resolves the entry through a bundler and walks the result's CSSOM in Chromium: the statement first with the ten names in order, every layer named anywhere one of the ten or a sublayer of one, none anonymous, the exact set each entry point opens, and nothing at the top level but the registration this README names. A second `@layer` statement is read too, because a statement puts a name into the order without opening a block for it. |
| An application tier's rule for a component beats the global tier's rule for the same component, whichever of the two a bundler loads first. | The two sublayers are named in the statement, so their order is fixed there rather than at first appearance. `tests/layer-set.test.ts` reads the statement back and asserts that `ds.components.app` is the one declared layer still waiting for content; the component packages move into the tiers when their stylesheets are wrapped, which is a separate change. |
| Nothing this package ships is written directly into `ds.components`: everything in that layer sits in a tier, so a component package can always override it by layer. | `tests/layer-set.test.ts` walks the resolved stylesheet for rules whose nearest enclosing layer is `ds.components` itself and requires none — every kind the cascade sorts by layer, not only style rules, because a browser settles duplicate `@keyframes`, `@font-face` and `@property` by layer too. A rule written straight into a parent layer lands in that layer's implicit final sublayer, above every named one. |
| This stylesheet confines nothing. | `tests/layer-set.test.ts` requires that neither entry point contains a single `@scope` block. Confining these rules to part of a page is the adapter's job, and it does it in its own copy; a scope appearing here would mean this stylesheet had quietly started doing it too, on pages that never asked. |
| `core.css` is `index.css` minus the three element layers and nothing else. | `tests/core.test.ts` checks the two entry points against each other as files: the same order statement, the same imports in the same order bar the three, and no rule in the resolved `core.css` that selects an element by tag name or claims one of the typographic engine's classes. `tests/layer-set.test.ts` adds what a browser makes of it — the exact layer set `core.css` opens, and that every layer the two share carries the same rules in both. |
| No file writes an `@import` after a rule. | `tests/layer-set.test.ts`, on every file this package and `@canonical/styles-typography` ship, as written rather than as resolved. A browser drops a late `@import` outright and a bundler inlines it, so the defect is invisible in both the shipped stylesheet and the built one — and the file that was meant to be imported is simply absent from the page. |
| The package ships no `!important`. | `tests/layer-set.test.ts` asks the browser, not the text: it reads `getPropertyPriority` for every declaration of every rule in both resolved entry points, which is what the cascade itself reads, and which reports `!IMPORTANT` and a comment written between the bang and the word as important too. A scan of each file in `src/` stays on top of it as source hygiene. An important declaration inverts the layer order and cannot be arbitrated by layers at all, so one of them would undo the guarantee above. |
| Under `prefers-reduced-motion: reduce`, every motion duration this package defines is `0s`. | `src/motion.css`, and the reduced-motion fixture arriving with the adapter package. Zeroing the token is the mechanism: a component reads the token, so nothing has to out-rank the component's own declaration. Whether a given component honours the tokens is that package's guarantee, not this one's. Sheets that still hard-code a duration, and so still animate under the preference, are being moved onto the tokens separately: in the form package the shared input chrome (`src/index.css`) and eight component sheets (`ChoicesField`, `RichChoicesField`, `CheckboxInput`, `RadioInput`, `ColorInput`, `ComboboxInput` and its list, `FileUploadInput`, `SwitchInput`); in the global package `Tooltip`, `ContextualMenu` and `Popover`, which set their own duration property; and one application-tier sheet, the launchpad diff viewer's file header. |
| The document root declares the baseline — font, colour, line height, weight, text wrapping, font smoothing — and the page inherits from there rather than from the browser's defaults. | The computed-style fixtures arriving with the adapter package, which read those properties off every element of a rendered block. |

Two guarantees that used to sit here are the adapter's, not this package's: that a region handed over
inside a page running another CSS framework computes as it does on an ordinary page, and that nothing
reaches a bare element outside such a region. `@canonical/styles-vanilla-adapter` states and tests both.

## What This Package Does Not Guarantee

- **Unlayered application CSS beats every rule here.** That is how the cascade is defined: a rule in no
  layer outranks a rule in any layer. It is not a defect, and it is the escape hatch — but it also
  means an application that wants this package's layer order to hold for its own CSS has to put that
  CSS in a layer too. See "Migrating" below.
- **`!important` in application or third-party CSS beats every rule here**, and for important
  declarations the layer order runs backwards, so the lowest layer wins. Nothing this package can do
  changes that.
- **This stylesheet styles the whole page.** The reset reaches every `<body>`, `<button>`, `<pre>` and
  `<legend>` in the document, and the layout presets claim the class names `grid`, `subgrid`,
  `responsive`, `intrinsic` and `content-flow` wherever they appear. That is what a design system's
  reset is, and it is why a page that also runs another CSS framework needs the adapter rather than
  this entry point.
- **`color-scheme` is set on the document root wherever this stylesheet is loaded**, because that is
  what the `light-dark()` tokens and the browser's own controls resolve against. It is the one thing
  here a consumer cannot opt out of by not using a class.

### Browser Floor

| Feature | Used by | Chrome | Safari | Firefox |
| --- | --- | --- | --- | --- |
| `light-dark()` | every colour token, including the `--color-text` the reset declares on the root | 123 | 17.5 | 120 |
| `mod()` | the baseline engine | 125 | 15.4 | 118 |
| `round()` | the baseline engine's line-height fallback | 125 | 15.4 | 118 |
| `@property` | the baseline engine's `--baseline-height` registration | 85 | 16.4 | 128 |
| `cap` unit | the default baseline engine | 118 | 17.2 | 97 |

Read the table as a whole, not row by row: the floor is the highest number in each column, because the
stylesheet uses all of it. A browser without `light-dark()` drops the root's `color` declaration as
invalid and falls back to its own text colour, so the reset applies but the page is not themed.

That makes the floor for this stylesheet with its default engine **Chrome 125, Safari 17.5,
Firefox 128**. Two of those rows are softer than the rest: `@property` only supplies the 4px fallback
for the grid unit, which this package declares anyway, and an application that swaps the default
engine for `baseline-trim.css` raises the floor to Chrome 133, Safari 18.2, Firefox 154.
`@canonical/styles-typography`'s "Browser Support" section is the full table, engine by engine.

The design system targets current browsers and does not carry compatibility shims for older ones. An
application that cannot move should pin a version.

## Migrating to the Layered Release

This release makes two changes that an application has to answer. Neither is markup: there is nothing
to add to your root, and the reset applies exactly where it did before.

1. **Your unlayered CSS now beats every rule in this package.** Before this release most of what the
   package shipped was unlayered too, so your overrides competed with it by source order and
   specificity, and sometimes lost. They no longer can. If you were relying on a rule of ours to win,
   it will not any more.

2. **Put your own CSS in a layer, or accept that it wins.** Either is a valid choice, and the second
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

If you import a subpath rather than the package entry — `@canonical/styles/spacing.css` and the five
other subpaths this package exports — note that a subpath carries no order statement, so the layers it
opens are ordered by wherever they first appear in your own stylesheet. Import the entry point unless
you have a reason not to.

### What Moves on the Page

Measured in Chromium, an application that is the design system's throughout, before against after, with
nothing added to the root. Four things change on every element, and one on `<hr>`; nothing else does.

| What | Before | After | Why |
| --- | --- | --- | --- |
| `line-height`, everywhere it was not set | `1.15` inherited from the old reset | `normal` | the document root declares its own baseline |
| `color`, everywhere it was not set | `rgb(0, 0, 0)` | `oklch(0 0 0)` | the root declares `var(--color-text)`: the same black in the light scheme, but it now follows the theme instead of being the browser's default |
| `box-sizing`, everywhere | `content-box` | `border-box` | the components are authored against it |
| `font-family` on `<html>` | the browser's serif | the token stack | the root declares the font; `<body>` already had it from the typographic mapper |
| `overflow` on `<hr>` | `visible` | `hidden` | the browser's own value; a rule has no content to overflow, so nothing shows |

Two things that used to be true and are not:

- The `normalize.css` package is no longer a dependency. This package writes its own reset, so it can
  be copied into the adapter's confined build, and so that it contains only the rules the design system
  actually relies on. If your
  application imported `normalize.css` through us and wants the rest of it, depend on it directly.
- The old README said component styles override modifier styles "regardless of source order". They did
  not: the layers were declared but almost nothing was written into them. They do now.

## Design Tokens

These token sets come from `@canonical/design-tokens`. Each generated file opens
its own layer, and the four layer names the generator emits — `ds.tokens`,
`ds.modifiers`, `ds.surfaces`, `ds.states` — are part of this package's cascade
contract rather than that package's private business: they are four of the ten
names in the statement above. `tests/layer-set.test.ts` checks every file in this
table against the layer the table gives it, and checks the last column against
what the entry actually imports, so a generator that renamed a layer, or an import
added or dropped here without a word, fails.

| Token set | Contents | Layer it opens | Imported by the entry | Selects elements? |
| --- | --- | --- | --- | --- |
| `sets.primitive` | Base colour palette, spacing scale, font sizes | `ds.tokens` | yes | no |
| `modifiers.theme` | Light/dark theme mappings, and `color-scheme` on the document root | `ds.modifiers` | yes | yes — `color-scheme`, and nothing else, for the reason above |
| `modifiers.surfaces` | Surface elevation tokens | `ds.surfaces` | yes | no |
| `modifiers.anticipation` | Constructive/destructive/caution intents | `ds.modifiers` | yes | no |
| `modifiers.criticality` | Error/warning/success/information states | `ds.modifiers` | yes | no |
| `modifiers.emphasis` | Branded/highlighted/muted emphasis | `ds.modifiers` | yes | no |
| `modifiers.importance` | Primary/secondary importance levels — the generated file is a header comment and nothing else, so the shipped mapping is this package's own shim | none | no | no |
| `modifiers.typography` | The typographic scale, reached through `@canonical/styles-typography` rather than imported here | `ds.modifiers` | no | no |
| `states` | Interactive state tokens (hover, active, focus, disabled) | `ds.states` | yes | no |

`modifiers.importance` is generated but not imported, by either entry point: the
file has no rule and no layer, so the import added a name to the graph and nothing
to the page, and an empty file that is known to be empty is what hides the next one
that is empty by mistake. The import comes back in the `@canonical/design-tokens`
release that emits the importance modifiers with content. Until then the test holds
both halves in place — it fails if that file stops being empty, and it fails on any
file an entry does import that contributes no rule.

## Dependencies

| Package | Role |
| --- | --- |
| `@canonical/design-tokens` | CSS custom properties for colour, spacing, and states |
| `@canonical/styles-typography` | Baseline grid engine and typographic scale |

## Package Structure

```
src/
  index.css                       -- entry point: the layer statement, then the imports
  core.css                        -- the same, without the three element layers
  normalize.css                   -- this package's own reset
  reset.css                       -- the document root's baseline
  spacing.css                     -- spacing tokens, and the content-flow container
  motion.css                      -- motion tokens, and reduced motion
  overflow.css                    -- scroll overflow affordance
  grid.css                        -- layout presets
  modifiers.density.css           -- the context x density family
  modifiers.*.shim.css            -- temporary shims for unfinished generated modifiers
  controls.hover.shim.css         -- temporary shim for control selected/hover channels
  fonts.css                       -- opt-in @font-face, unlayered
tests/
  core.test.ts                    -- the two entry points against each other, as files
  layer-set.test.ts               -- the cascade contract, in a browser
  support/                        -- the file resolver, and the CSSOM walks
```
