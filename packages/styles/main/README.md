# @canonical/styles

This README is written for two readers: the person adding the design system to an application, and the
person maintaining this package. Where a claim can be checked by a test, the test is named.

The Canonical Design System's global stylesheet. One import brings in the reset, the typographic
engine, the design tokens, the modifier families and the layout presets. Everything this package
itself ships is in a named cascade layer, and its element-level rules style the whole page, as a
reset does — nothing is confined and nothing has to be marked. The typographic engine, which lives in
`@canonical/styles-typography` and is released with this package, is in the same layers.

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

## Entry points

Four, and `@canonical/styles` is the one an ordinary page wants: the whole stylesheet, in the order
above. The other three are that stylesheet in parts.

| Entry | What it is | Layers it opens |
| --- | --- | --- |
| `@canonical/styles` | everything: the values, the element rules and the layout presets. | `normalize`, `ds.tokens`, `ds.reset`, `ds.typography`, `ds.modifiers`, `ds.surfaces`, `ds.states`, `ds.components.global` |
| `@canonical/styles/tokens.css` | every custom property the design system declares, and not one rule that styles an element. Import it and nothing changes on the page until something reads a value from it. | `ds.tokens`, `ds.modifiers`, `ds.surfaces`, `ds.states` |
| `@canonical/styles/elements.css` | every rule the design system applies to a plain element: the reset, the root's baseline, and the typography with its baseline engine. | `normalize`, `ds.reset`, `ds.typography` |
| `@canonical/styles/layout.css` | the layout presets — `grid`, `subgrid`, `responsive`, `intrinsic` and `content-flow` — which claim those five class names in a page's namespace. | `ds.components.global` |

Eight, four, three and one. The whole opens every layer any part opens, and the
three parts between them open every layer the whole does — the element layers are
exactly what `tokens.css` and `layout.css` leave out, which is the split's whole
point. `tests/layer-set.test.ts` reads that last column back out of a browser.

The parts exist for one reason. A page that also runs another CSS framework cannot take the element
rules: the other framework has its own `p` rule, and only one of the two can own `line-height`. Such a
page takes `tokens.css` and `layout.css`, and gets its element rules from that framework's adapter
instead, in a copy confined to the part of the page the design system owns —
`@canonical/styles-vanilla-adapter` builds that copy out of the same files `elements.css` imports.

Two properties make the parts safe to mix, and a test in this package holds both.

**Every entry opens with the same layer order statement.** It has to be the first rule of whichever
stylesheet a page loads first, because it fixes the order of every layer for that page; two entries
declaring different orders would mean the same rules arbitrating differently depending on which entry
a consumer picked.

**No entry imports another.** An `@layer` statement inside a layer block declares sublayers of that
layer rather than top-level layers, so an entry that composed another would nest the order instead of
repeating it. Keeping them independent means a page may load one, two or all three, in any order, and
get the same result — and that each file is fetched, parsed and applied once, which matters because a
browser treats every `@import` as its own stylesheet and de-duplicates nothing.

## Cascade Layers

Everything this package itself ships is in a named layer, and the order is fixed by one statement, the
first rule of this stylesheet. The typographic engine, which this package imports, is in the same
layers:

```css
@layer normalize, ds.tokens, ds.reset, ds.typography, ds.modifiers, ds.surfaces,
  ds.states, ds.components, ds.components.global, ds.components.sites,
  ds.components.documentation, ds.components.stores, ds.components.apps;
```

Read it from the bottom up — each position is an argument.

| Layer | What is in it | Why it sits where it does |
| --- | --- | --- |
| `normalize` | This package's own reset. | Lowest, because everything else is meant to overrule it. |
| `ds.tokens` | The primitive values, and the spacing, motion and overflow tokens. | Above the reset, because a token has to exist before anything reads it; below everything that reads one. |
| `ds.reset` | The declarations the document root makes for itself: font, colour, line height, weight, text wrapping, font smoothing — and border-box sizing for it and everything inside. | Above the tokens because it reads them; below the typographic engine and the components, which refine what it starts. |
| `ds.typography` | The element rules that apply the typographic mapping, and the baseline engine, from `@canonical/styles-typography`. | Above the reset because it is a more specific statement about text; below the modifiers, which can retune the scale. |
| `ds.modifiers` | Theme, the typographic scale, the intent families (anticipation, criticality, emphasis, importance) and their shims, and the context and density classes. | Above typography, because a modifier's job is to shift what the layers below produced. |
| `ds.surfaces` | The surface families: `surface`, `contrasted`, `modal`. | Above the modifiers, because a surface re-points colour channels the modifiers set. |
| `ds.states` | The derived hover, active and disabled channels. | Above the surfaces, because a state is derived from whatever the surface resolved to. |
| `ds.components` | Nothing, by rule. It is the parent of the tier layers below and holds no rule of its own. | Highest of the eight top-level layers, so a component is the final word on its own box. A rule written *directly* into a parent layer sits in that layer's implicit final sublayer, which is above every named sublayer — so such a rule would outrank every tier and no component package could override it by layer. Everything this package puts in `ds.components` therefore sits in a tier. |
| `ds.components.global` | The stylesheets of the shared component packages, and this package's own layout presets. | The base of the tier tree: what every other tier refines. |
| `ds.components.sites` | The stylesheets of the sites tier. No entry point of this package opens it; the packages in that tier do. | The four second-level tiers never appear on the same page, so their order among themselves decides nothing. It is fixed here anyway, so that it can never come to depend on which package a bundler emits first. |
| `ds.components.documentation` | The stylesheets of the documentation tier. No entry point of this package opens it; the packages in that tier do. | As above. |
| `ds.components.stores` | The stylesheets of the stores tier. No entry point of this package opens it; the packages in that tier do. | As above. |
| `ds.components.apps` | The stylesheets of the shared applications tier; one application's own tier declares a layer of its own above it. No entry point of this package opens it; the packages in that tier do. | As above. |

An order statement fixes the relative order of layers the first time they appear. A later statement
may introduce new names but can never reorder the ones already fixed, so an application that needs to
interleave a layer of its own puts its statement before this import.

The statement above, the tables below, the entry table's last column and the list
of what is deliberately unlayered are not prose. `tests/layer-set.test.ts` reads
them out of this file and compares them against the stylesheets a bundler
resolves, so a README that disagrees with the CSS fails the build instead of
misleading a reader.

What the test binds is one answer per file and per layer. A file may appear twice
when it writes to two layers — `overflow.css` puts its root default in one and
its surface channel in another — and it is then checked on the union of its rows. No
file has two rows for the same layer, because the test could only read the
disjunction of two answers to one question; where a file needs two things said
about one layer, the row says both. Reordering rows changes nothing a browser can
see, and the test says nothing about it.

#### The Component Tiers

The component layers follow the design system's tier tree: who owns a component decides which layer
its rules go in, and a deeper tier wins. Three rules make that work, and they are worth stating
plainly because a package author has to follow them.

**The second level is named here, in full.** `global`, `sites`, `documentation`, `stores` and `apps`
are the design system's four second-level tiers plus the shared base, and this statement fixes their
order. A package in one of those tiers wraps its stylesheets in its own name and needs to do nothing
else.

**A sub-tier declares its own layer, and that is what sorts it above.** One application's own package
— the LXD tier, say — opens its CSS entry with `@layer ds.components.apps-lxd;` and wraps every sheet
in that layer. Because this package's statement is always the first rule the browser sees, that name
is new when the browser meets it, so it is appended after the names above, inside `ds.components`, and
sorts above them. That is the tree's own rule — the more specific tier wins — and it means this
stylesheet never has to know which applications exist. Measured: with this statement first, a rule in
`ds.components.apps-lxd` beats the same rule in `ds.components.apps` and in `ds.components.global`,
whatever order the files load in.

**Nothing is ever written directly into `ds.components`.** A declaration in a parent layer sits in
that layer's implicit final sublayer, which is above every named sublayer, so a rule written there
would outrank every tier — the opposite of what the tiers are for.

The names are tier ids from that tree, lowercased and hyphenated for a sub-tier (`apps-lxd`,
`sites-webcomponentsprototype`). They are not the context words a page puts on its root (`app`,
`site`, `docs`): a tier says who owns a component, a context says what kind of page it is being shown
on, and the two are chosen by different people for different reasons.

### What Is Layered Where

| File | Layer | Selects elements? |
| --- | --- | --- |
| `normalize.css` | `normalize` | yes |
| `reset.css` root declarations | `ds.reset` | yes |
| `reset.css` box-sizing | `ds.reset` | yes — `*`, `::before`, `::after` |
| `spacing.css` | `ds.tokens` | no |
| `motion.css` | `ds.tokens` | no |
| `overflow.css` root default | `ds.tokens` | no |
| `overflow.css` `.surface` | `ds.surfaces` | no |
| `grid.css` | `ds.components.global` | yes — the layout presets and the content-flow container; the `:root` block beside them declares only the tokens those presets read, kept with them rather than moved to `ds.tokens` |
| `modifiers.density.css` | `ds.modifiers` | no |
| `modifiers.states.shim.css`, `modifiers.importance.shim.css`, `modifiers.criticality.shim.css` | `ds.modifiers` | no |
| `controls.hover.shim.css` | `ds.surfaces` and `ds.states` | no |
| `@canonical/styles-typography` element rules and engine | `ds.typography` | yes |
| `@canonical/styles-typography` naming shims, and the typographic scale it imports | `ds.tokens` and `ds.modifiers` | no |

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

One thing, and a layer has nothing to order it against: this stylesheet declares
each face exactly once, so putting it in a layer would change no computed value
and would invite a reader to look for the layer that "wins". Layers do sort
`@font-face` rules where two of them declare the same family — the higher layer's
face wins over the later one in source order — and there simply are no duplicates
here.

| Rule | Where it is written, and why a layer would say nothing about it | Reaches an entry |
| --- | --- | --- |
| `@font-face` | `fonts.css`. It defines a font for the whole document, not a style for an element. The file is opt-in and imported separately (`@canonical/styles/fonts`) so that an application already serving the same files does not download them twice. | no |

The last column is the one worth checking, and `tests/layer-set.test.ts` checks it
both ways: nothing sits outside a layer in any of the four entry points that this
table does not name, and everything the table says reaches an entry is found
there. The fonts do not, because they are a separate entry point — so every rule
the four entries deliver is inside a layer, with nothing left over to outrank
them all.

### Where the Element-Level Rules Apply

To the whole page. Three of the layers select elements rather than declare custom properties —
`normalize`, `ds.reset` and `ds.typography` — and they apply the way a reset always has: the
stylesheet is loaded, so the rules are in force. There is no marker to add and
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
| Every rule the package itself ships is in one of the ten declared layers, and the statement is the first rule of this stylesheet. The typographic engine it imports is in them too. | The order fixtures that arrive with the Vanilla adapter package read the statement out of the resolved stylesheet and check every layer name the package opens against it. A check inside this package — that the set of layers used equals the set declared — is being added separately. |
| An application tier's rule for a component beats the global tier's rule for the same component, whichever of the two a bundler loads first. | The two sublayers are named in the statement, so their order is fixed there rather than at first appearance, and the same order fixture reads it back. The component packages move into them when their stylesheets are wrapped, which is a separate change; until then both sublayers are empty and the guarantee is vacuous. |
| The package ships no `!important`. | The same fixture file. An important declaration inverts the layer order and cannot be arbitrated by layers at all, so one of them would undo the guarantee above. |
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
| `cap` unit | the default baseline engine | 118 | 17.2 | 97 |

Read the table as a whole, not row by row: the floor is the highest number in each column, because the
stylesheet uses all of it. A browser without `light-dark()` drops the root's `color` declaration as
invalid and falls back to its own text colour, so the reset applies but the page is not themed.

That makes the floor for this stylesheet with its default engine **Chrome 125, Safari 17.5,
Firefox 120**. An application that swaps the default engine for `baseline-trim.css` raises it to
Chrome 133, Safari 18.2, Firefox 154. The typographic engine also uses `round()`, on the same numbers
as `mod()`; `@canonical/styles-typography`'s "Browser Support" section is the full table, engine by
engine.

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
     ds.components.sites, ds.components.documentation, ds.components.stores,
     ds.components.apps, app;
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
table against the layer the table gives it, and checks the last two columns
against what the entry points actually import and deliver, so a generator that
renamed a layer, or an import added or dropped here without a word, fails.

| Token set | Contents | Layer it opens | Imported by an entry | Selects elements? |
| --- | --- | --- | --- | --- |
| `sets.primitive` | Base colour palette, spacing scale, font sizes | `ds.tokens` | yes | no |
| `modifiers.theme` | Light/dark theme mappings, and `color-scheme` on the document root | `ds.modifiers` | yes | yes — `color-scheme`, and nothing else, for the reason above |
| `modifiers.surfaces` | Surface elevation tokens | `ds.surfaces` | yes | no |
| `modifiers.anticipation` | Constructive/destructive/caution intents | `ds.modifiers` | yes | no |
| `modifiers.criticality` | Error/warning/success/information states | `ds.modifiers` | yes | no |
| `modifiers.emphasis` | Branded/highlighted/muted emphasis | `ds.modifiers` | yes | no |
| `modifiers.importance` | Primary/secondary importance levels — generated empty, so the shipped mapping is this package's own shim | none | yes | no |
| `modifiers.typography` | The typographic scale, reached through `@canonical/styles-typography` rather than imported here | `ds.modifiers` | no | no |
| `states` | Interactive state tokens (hover, active, focus, disabled) | `ds.states` | yes | no |

`modifiers.importance` is the one file an entry imports that contributes no rule,
and the empty *Layer it opens* cell is how the test knows to allow it: every other
file an entry imports has to deliver something, so the next one that quietly
empties fails instead of passing unnoticed. The shim beside it supplies the
importance channels meanwhile; both go when the generator emits that family with
content.

## Dependencies

| Package | Role |
| --- | --- |
| `@canonical/design-tokens` | CSS custom properties for colour, spacing, and states |
| `@canonical/styles-typography` | Baseline grid engine and typographic scale |

## Package Structure

```
src/
  index.css                       -- entry point: the layer statement, then the imports
  normalize.css                   -- this package's own reset
  reset.css                       -- the document root's baseline
  spacing.css                     -- spacing tokens
  motion.css                      -- motion tokens, and reduced motion
  overflow.css                    -- scroll overflow affordance
  grid.css                        -- layout presets
  modifiers.density.css           -- the context x density family
  modifiers.*.shim.css            -- temporary shims for unfinished generated modifiers
  controls.hover.shim.css         -- temporary shim for control selected/hover channels
  fonts.css                       -- opt-in @font-face, unlayered
```
