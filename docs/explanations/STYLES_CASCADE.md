# The cascade contract

This is for the person who maintains one of pragma's stylesheets. It explains why the design system's
CSS is arranged the way it is, so that the next rule you write lands where the rest of the system
expects it, and so that you can tell a deliberate arrangement from an accident when you read someone
else's file.

It is the reasoning, not the reference. What is layered where, which files open which layer, which
browser floors apply and what each package guarantees live in the package READMEs —
[`@canonical/styles`](../../packages/styles/main/README.md#cascade-layers) and
[`@canonical/styles-typography`](../../packages/styles/typography/README.md#cascade-layers). Where
the same fact appears here and there, the README is the one to trust: it is next to the stylesheet it
describes. The contract itself is checked from outside, by the fixtures in
`@canonical/styles-vanilla-adapter`, which render both kinds of page in a browser; where something
here is asserted rather than argued, that is what asserts it.

If you are upgrading an application to the first layered release rather than maintaining the styles,
read [Migrating to the layered styles release](../how-to-guides/MIGRATE_TO_LAYERED_STYLES.md) instead.

## How a browser decides

For one property on one element, the browser gathers every declaration that could apply and sorts
them by these criteria in turn, stopping at the first one that separates two candidates:

1. **Origin and importance.** Whose stylesheet it is — the browser's own, the reader's, the page
   author's — and whether the declaration is marked `!important`.
2. **Context.** A shadow tree's own styles against the styles of the document that hosts it.
3. **Element-attached styles.** A `style` attribute beats any stylesheet rule.
4. **Cascade layers.** The layer the rule sits in, in the order one statement fixed.
5. **Specificity.** The familiar count of ids, classes and element names in the selector.
6. **Scope proximity.** Between two rules scoped to different roots, the one whose root is nearer the
   element wins.
7. **Order of appearance.** Whichever the browser read last.

Almost every argument in this document is about criterion 4, and about the fact that it is decided
*before* criteria 5 and 7. A layer is not a stronger selector: it is a decision taken earlier, which
means it cannot be talked out of by a longer selector or by an import that happens to land later.

Two consequences carry the rest of this document.

**A rule in no layer beats a rule in every layer.** This surprises people, and it is not a defect. The
cascade treats unlayered author rules as the author's last word, above all of their layered ones,
whatever the selectors on either side say. So a single unlayered rule silently outranks the entire
system, and no reordering of the layers can bring it back. That is also the escape hatch: an
application that overrides pragma from an unlayered stylesheet wins by design, which is the behaviour
the [migration guide](../how-to-guides/MIGRATE_TO_LAYERED_STYLES.md) exists to explain.

**`!important` runs the layer order backwards.** Among important declarations the *earliest* layer
wins, and an unlayered important declaration loses to a layered one. So an important rule in the
lowest layer is the strongest author rule on the page, and it cannot be arbitrated by layers at all.
That is why the styles package ships none, and the adapter's fixtures check it from the outside, over
pragma's CSS on both kinds of page rather than over a claim in a README. One important declaration is
still left elsewhere in pragma, a margin on the Tooltip; removing it belongs to the hygiene step of
the same programme.

## Why this needed deciding

Before the layered release, almost everything pragma shipped was unlayered too, and the layer
statement in its entry point named four layers that nearly nothing was written into. The promise the
old README made — that component styles beat modifiers, which beat the reset, regardless of import
order — was true of the intent and false of the code. Rules competed on specificity and on which
bundle chunk a bundler emitted first, and nothing could tell you.

On a page that also runs another CSS framework, the same arrangement produces a worse failure, and it
is the one that started this work. Both systems styled a bare `p` at the same specificity, so whichever
loaded second owned line height and spacing; and because the leak is *per property*, every property
only one of them declared came through regardless — one system's measure width beside the other's
letter spacing, on a paragraph neither system designed.

The obvious repair is a stylesheet that zeroes, for each element pragma renders, whatever the other
framework set. It is a trap: the leak is per property rather than per element, so such a file has to
enumerate properties; the other framework has hundreds of rules with no class in their selectors; and
the set changes with every release of it. Whoever writes that file owns an inventory forever, and every
miss is a visible bug on a production page.

So the repair has to be structural, and of the criteria above, the layer is the only one above both
specificity and order that an author's own stylesheets can arrange. Which is why the first thing
pragma had to do was make its own declared contract real: every rule that declares style in a named
layer, and one statement fixing their order. Where the rules that select bare elements have to be confined is a
question with its own answer, further down: not in pragma's stylesheet, but in the package written for
the pages that need it.

## One statement, thirteen names

Layer order is settled by first appearance. A layer that first appears in whichever file a bundler
happened to emit first takes a position nobody chose, and once a layer exists a later statement can add
names after it but can never reorder it. One statement, first, is the only arrangement in which the
order is a decision instead of an accident. Pragma declares it in one file, `layers.css`, which holds
the statement and nothing else, and every entry imports that file as its first rule — a statement read
through an `@import` orders the importing sheet exactly as one written in place would, measured in a
browser. Writing it once is the point: five copies of one ordered list are five chances to drift, and
the order is the thing least able to survive drifting. The order itself reads:

```css
@layer normalize, ds.tokens, ds.reset, ds.typography, ds.modifiers, ds.surfaces,
  ds.states, ds.components, ds.components.global, ds.components.sites,
  ds.components.documentation, ds.components.stores, ds.components.apps;
```

(The [README's layer table](../../packages/styles/main/README.md#cascade-layers) is the reference for
what goes in each of them.)

Read it from the bottom up; each position is an argument, and each is the answer to "what should be
able to overrule this?"

- **The reset is lowest** because everything else is meant to overrule it. It is pragma's own file
  rather than an import of `normalize.css`, because a third-party file cannot be authored inside a
  scope block — the next section says why that matters — and because writing only the rules the system
  relies on is what the constitution asks for over importing a file and stripping it afterwards.
- **Tokens sit above the reset and below everything that reads one.** Not because a `var()` read
  depends on the layer its declaration sits in — it does not — but because overriding a token has to
  be possible from every layer that reads one, and because nothing should have to out-specify a token
  to use it.
- **The root's baseline** — the font, colour, line height and box sizing pragma's root declares for
  itself, which is the document element on a pragma page — sits above the tokens because it reads
  them, and below the typographic engine and the components, which refine what it starts.
- **Typography above that**, because it is a more specific statement about text than the baseline is.
- **Modifiers above typography**, because a modifier's whole job is to shift what the layers below
  produced. **Surfaces above modifiers**, because a surface re-points colour channels a modifier set.
  **States above surfaces**, because a state is derived from whatever the surface resolved to. Each of
  those three is the input to the next, and the order is that pipeline written down.
- **Components highest**, so that a component is the final word on its own box. Everything below it is
  material it composes, and a component that has to escalate its selector to beat one of pragma's own
  rules is reporting a layer that is in the wrong place.

An application adds one more name above all of these for its own CSS. The migration guide shows the
shape.

### Nothing may be written directly into `ds.components`

A rule written straight into a parent layer does not sit beside its sublayers — it sits in the layer's
implicit final sublayer, which is *above* every named one. So `@layer ds.components { .thing { … } }`
beats `@layer ds.components.apps { .thing { … } }` no matter what the statement says. Measured, and the
reason pragma's layout presets moved out of the parent layer and into the global tier: a component
package could not override them by layer, only by specificity, which is the failure the layers were
meant to end.

The rule for a maintainer is short: if you are writing a component rule, name a tier. The styles
package holds to it; one sheet in the form package still writes a layout preset straight into
`ds.components`, and the change that wraps the component stylesheets by tier folds it into a tier with
the rest.

### The component tiers follow the tier tree, flat

Component packages are organised in tiers — a global tier and, above it, tiers for the kinds of
product the system serves. The layers under `ds.components` are those tiers, named by their tier id
and not by a context word, so that the layer a stylesheet writes into is the tier the graph already
says it belongs to, with no second vocabulary to keep in step.

**The second level is named in the statement**, all five of it:
`ds.components.global`, then `ds.components.sites`, `ds.components.documentation`,
`ds.components.stores` and `ds.components.apps`. That is what makes a product tier's rule for a
component beat the global tier's rule for the same component whatever order a bundler loaded the two
packages in. A sublayer left to a `@layer ds.components.apps { … }` block somewhere in the tree would
take its position from whichever file opened it first, which is exactly the bundler-order dependency
the statement exists to remove.

Among the four product tiers the order decides nothing — no page loads two of them — and the statement
fixes it anyway, so that it can never come to depend on which package a bundler emitted first. What
each of them needs is only to sit above `ds.components.global`, and that is what the statement
guarantees.

**A sub-tier package declares its own layer**, and the order of three lines in its CSS entry is the
whole of the recipe:

```css
@import url("@canonical/styles/layers.css");   /* 1. fix the thirteen */
@layer ds.components.apps-lxd;                 /* 2. then name your own */
/* 3. then import your stylesheets */
```

The sub-tier name is not in pragma's statement, and does not need to be: a name the statement does not
carry is placed where it first appears, so a name that first appears *after* the thirteen lands above
them, which is where a sub-tier belongs. Nothing has to be reserved in advance, and pragma does not
have to know which sub-tiers exist.

What the first line buys is that "after" stops depending on the bundler. Without it, the sub-tier's
declaration is read wherever the bundler happened to emit that package: emitted before the design
system's entry, the sub-tier name is first and therefore lowest, and every design-system layer is
appended above it — the exact inversion the tier is meant to prevent. Measured over the four emission
orders a bundler can produce for one such package: declared before the statement is read, the
application tier won in one of the four; with the import first, in four of four. The import costs
nothing, because the statement is idempotent — the second reading of the same order changes no rank.

**The names are flat, and the hyphen is load-bearing.** `ds.components.apps-lxd` is a sublayer of
`ds.components`, a sibling of `ds.components.apps`. Written as `ds.components.apps.lxd` it would be a
sublayer of `ds.components.apps` instead, and the section above says what happens then: the rules the
`apps` tier writes directly into its own layer would sit in that layer's implicit final sublayer and
outrank everything under it, so a sub-tier could never override its parent by layer. The tree in the
graph is a hierarchy; the layer names that mirror it have to be flat to keep that hierarchy working.

**A package resets only the elements it renders.** A universal reset in a component layer —
`* { margin: 0; padding: 0 }`, the habit a page-level stylesheet teaches — reaches every element on
the page, the components of every other package included, and the tiers cannot arbitrate it. They are
exactly the machinery for that argument, and they settle it the wrong way round: a higher tier beats a
lower one whatever the selectors say, so a blunt universal rule in an application tier quietly defeats
a deliberate one in the global tier. Measured, such a reset flattened a global-tier component's 16px
padding to zero. Reset what you render, and nothing else.

This one is written down rather than checked. Telling a reset apart from a legitimate universal rule —
the border-box declaration further down is one — takes a judgement about intent, which is not a
judgement a test can make; a check that tried would either miss the resets or condemn the rules the
system depends on.

(The styles change that carries these names is stacked below this one.)

One related trap, measured: importing a stylesheet with `@import url("…") layer(L)` when that
stylesheet itself opens `L` nests it as `L.L` — a sublayer that loses to `L`'s own rules. Pragma's own
sheets carry their layers, so its imports are bare; the `layer()` keyword on an import is for a
third-party file that carries none.

## Where the confinement lives

Three of pragma's thirteen layers select bare elements: `normalize`, `ds.reset` and `ds.typography`
— the reset, the root's baseline and the typographic engine. On a page that is pragma's, that is exactly
what you want. A paragraph is styled because it is a paragraph, wherever it sits and whoever wrote the
markup, and nothing has to opt in.

On a page that also runs another CSS framework it is exactly what you do not want, because the other
framework styles the same paragraph and neither system designed the result. That is the bug this
document starts from.

The two demands cannot be met by one file, so pragma does not try to meet them there. **Its own
stylesheet stays plain: no `@scope`, no marker class on any root, no switch that changes what a rule
means.** The confinement lives in the package that exists for the pages that need it.

So the package is cut along that seam into four entries, with a fifth that is only the order
statement, and the adapter carries a copy of one of them:

| Entry | What is in it | A pragma page | A mixed page |
| --- | --- | --- | --- |
| `@canonical/styles` | Everything: the values, what bare elements get, and the layout presets. The file is `index.css`. | imports this | — |
| `@canonical/styles/tokens.css` | Four layers of values — `ds.tokens`, `ds.modifiers`, `ds.surfaces`, `ds.states` — and the classes that set them. No rule that selects an element, with the one exception below. | (in the whole) | imports this |
| `@canonical/styles/elements.css` | `normalize`, `ds.reset`, `ds.typography` — what bare elements get. | (in the whole) | takes the adapter's copy instead |
| `@canonical/styles/layout.css` | The layout presets, `content-flow` among them, which claim five class names in a page's namespace. | (in the whole) | imports this |
| `@canonical/styles/layers.css` | The order statement and nothing else: no rule, no import, no declaration, and no layer opened — a statement places names in an order, it does not put a rule in one. It is there for a package that has to fix the order before declaring a layer of its own — a sub-tier component package, below. | — | — |

One exception is worth knowing before you import the values on their own: the design tokens' generated
theme sheet declares `color-scheme` on `:root`, `.light` and `.dark` beside the colour tokens, and that
property is not inert. It decides the canvas, the form controls, the scrollbars and the system colours
whether or not anything reads a token. It cannot be separated out here, because the sheet is generated
with those declarations inside the same rules as the tokens; the README says what an application that
must not have it can do instead. What the adapter's fixtures do assert is the neighbouring property,
and it is the one that matters on a mixed page: neither the values entry nor the layout entry puts
anything but custom properties into the three element layers, so nothing of pragma's reaches the other
framework's headings and paragraphs from a layer above it.

Every entry imports the order before anything else, so importing one settles the layer order exactly as
importing all of them does — and there is only one file to be right about. No entry imports another
entry, though: an `@layer` statement inside a layer block declares sublayers rather than top-level
layers, so a whole that imported its parts would nest the order instead of sharing it. A page may load one, two or all of them, in any order, and get
the same result, each file parsed once — the statement is idempotent, and reading the same one twice
does nothing the first reading did not already do. That is what makes `layers.css` safe for a package
to import in front of its own layers. The typography package is cut along the same line — a
`tokens.css` and an `elements.css` of its own, beside its engines — and the styles package's entries
import from it.

One rule of composition follows, and it is worth stating on its own because the instinct runs the
other way: **a value the composition always declares is read bare.** One file declares it, every
reader reads it without a fallback, and a file that can be loaded outside the composition says so in
its own header rather than carrying a private default. A fallback at each read looks defensive and is
the opposite — it is a second declaration of the value, repeated once per reader, and the copies drift
apart the first time the value changes. The baseline unit is the worked example: the values entry
declares it, the element rules and the engines read it bare, and an engine linked on its own, outside
the composition, has no default at all and says so.

A pragma page imports the whole and is done: one import, no markup change, nothing about coexistence
in its stylesheet or its templates. A mixed page imports `tokens.css` and `layout.css` from the
package, and the adapter's own `elements.css` in place of the package's — the same three layers, the
same declarations, written inside `@scope (.ds)` so that they reach only the subtrees that are
pragma's. Those are the elements carrying `ds`: every component carries it on its own root, and a
migrated region carries it because the team put it there.

### Why a copy, and how it stays honest

A copy is a liability — two files that have to say the same thing — so it is worth being plain about
what it buys and what keeps it true.

What it buys is that every page which does not run two systems is left alone. No class on the root, no
scope block, no browser floor beyond the one pragma already had, nothing in the markup to remember,
and a stylesheet a contributor can read without knowing that a second arrangement exists. The
arrangements that avoid the copy all do it by moving the coexistence concern into pragma's own files
and into every application's root markup, so that the many pay for the few.

What keeps it true is a test, in the adapter, that binds its `elements.css` to the package's: it reads
the three element layers out of pragma's source files and compares them with the copy, so a rule added
to the reset or the engine that the copy does not carry fails the adapter's build. The copy is
written by hand and checked by machine — not maintained by memory, and not generated at build time,
because nothing here is transformed between what a contributor writes and what the browser runs
([no magic](../../CONSTITUTION.md)).

### The one file with `@scope` in it

The adapter's `elements.css` is the only file in the system that uses `@scope`; the package's own
`elements.css`, which it copies, is plain. That matters twice over: the idioms below are local to that one file,
and so is its browser floor.

A scoped selector is relative to its scoping root and never matches that root, so a rule that has to
reach the root itself names `:scope`. Two idioms do that, and the difference between them is the
difference between a container and a control:

- `:where(:scope:not(.ds *))` — **the outermost island.** Every pragma component carries `ds` on its
  own root, so **a bare `:scope` matches every element carrying the class**: each component is a
  scoping root of its own, and the baseline declarations would land on all of them. Measured in
  review, exactly that — an icon inside a coloured link resetting to the baseline colour instead of
  inheriting the link's, a card inside a card losing its container's font. The qualifier keeps the
  declarations on the element that opens the island, and everything inside inherits from it, which is
  the point.
- `:where(:scope, :scope *):is(…)` — **an element that may itself be the island.** A control rule has
  to reach a `<button>` wherever it sits, and a pragma Button *is* a root: there the island and the
  control are the same element. Naming the root and its descendants together is what covers the case
  that a plain descendant selector misses.

One rule sits outside the scope block on purpose: the universal border-box declaration, written
`:where(.ds, .ds *)` in the same layer. It is the only rule with universal reach, so every element in
the tree is a candidate for it and each candidate would pay a scope-activation check; the regression
was measured on a large page, and the README records the number. The match set, the specificity and
the layer are identical either way, which is what makes the swap safe. Nothing else takes that form,
and a new rule should not take it without a measurement.

One thing that does not work at all, also measured, before you spend an afternoon on it: **`:root`
inside the scope matches nothing.** Every bare selector inside the block is read relative to the
scoping root, as a descendant of it, and the document element is nobody's descendant. A rule that has
to reach the document itself does not belong in this file — which is no loss, because the layers that
declare custom properties are not in the copy: a custom property does nothing where it is declared,
only where a rule reads it, and every rule that reads one is either in the copy or matches a
design-system class.

**The floor.** `@scope` needs Chrome 118, Safari 17.4 and Firefox 146, and because it appears in this
one file, **only a mixed page stands on that floor.** A pragma page's floor is what the typographic
engine already required, and the README's browser table lists it. Below the floor on a mixed page the
block is dropped whole: components keep their own styles, and the text inside them falls back to the
browser's.

### The root declares the baseline

Keeping another system's *rules* off pragma's elements does not keep its *inherited values* off them.
A host page that sets a colour, a font, a line height or a weight on its document element hands those
down to every pragma component inside it, and reverting declarations cannot undo an inherited value.
So pragma's root declares the baseline itself — the font, the colour, the line height, the weight and
the text-wrap style — rather than letting whatever is above it decide.

On a pragma page that is a plain rule on the document element, and nothing about the page changes
hands. In the confined copy the same declarations land on the outermost island, by the first idiom
above, which is what makes a pragma region render as pragma's own wherever it is placed.

Note what neither of them relies on: scope proximity. Proximity is a real cascade criterion, but it is
consulted after specificity and only between rules scoped to different roots, so it is too subtle a
thing to hang a baseline on. Qualifying the selector says what is meant, in the selector, where the
next maintainer will read it.


## What stays outside a layer

One thing, and the reason is not the one most people give.

`@font-face` defines a *name* — a font family — rather than declaring style on an element. There is
nothing in it for an unlayered rule to win with, so leaving it at the top level creates none of the
hazard that an unlayered style rule does. Pragma writes its font faces in a file of their own, beside
the other declarations of their kind, which makes them easy to find.

The claim to avoid is that layers cannot sort at-rules of this kind. They can, and it was measured in
current Chromium and Firefox: given two font faces of the same family, or two registrations of the
same custom property, the one in the higher layer wins even when it is written first, and an unlayered
one beats a layered one written after it. The reason pragma's font faces are unlayered is that there
is exactly one of each name, so no layer has anything to order them against — not that a layer would
be ignored.

The consequence for a maintainer: if you ever ship a second face of the same family, or a
`@property` registration of a name something else also registers, you are relying on layer order
whether you meant to or not, and it should be layered on purpose. Pragma ships no registration today.
The one it used to have, for the baseline unit, is gone: the default now sits in the values entry as an
ordinary declaration at zero weight, `:where(:root) { --baseline-height: 0.25rem }`, which any real
declaration beats whatever the order within the layer, and the engines read the property bare. That is
also what frees the unit to be written in `rem` or in `px`: a registration's initial value has to be
computationally independent, and `rem` is not. An engine linked on its own, without the values, is the
one case with no default at all.

## What a bundler does to the statement

Do not verify the contract by grepping a built file for the statement. A minifier rewrites it, and
Lightning CSS — the transformer Vite uses on pragma's reference build — was measured doing all of
this: it merges blocks that share a layer name, reorders them into the order the statement declared,
deletes the statement, and emits a statement only for a declared name that no block establishes,
placed so that name keeps its rank. It also keeps only the last copy of a duplicated rule.

The semantics survive; the text does not. So on such a build the property to check is not "the
statement is the first rule" but "the layer blocks, read in file order, are in the declared order",
with the at-rules that may precede them — `@charset`, `@font-face`, `@property`, `@keyframes` — ahead
of the first. Where the statement does survive, the blocks stay in the order the files were imported
and it is each name's *first* appearance that follows the statement, which is all the cascade ever
promised. The
[migration guide](../how-to-guides/MIGRATE_TO_LAYERED_STYLES.md#2-check-the-layers-on-a-built-page)
carries the snippet that reads that sequence out of a live page. The adapter's fixtures ask the same
question of a browser rather than of a file: they load both kinds of page and assert that every layer
pragma's CSS uses is one the statement names, that every entry reads the one file that declares the order, and that
the ranks come out as written — including a sub-tier layer declared later, which must sort above its
tier.

One more thing a bundler cannot fix: an aggregate stylesheet imported first does not pin a rule's
position on such a build, because the duplicate that survives is the last one. Position stops mattering
once the component sheets carry their tier, which is the point of carrying it.

## Living beside another framework

A page that runs pragma and another CSS framework at once takes the package's `tokens.css` and
`layout.css` in place of its whole entry, adds the adapter's confined `elements.css`, and gains
three layers: one at the bottom for that framework, one directly above it that reverts what the
framework declared inside pragma's islands back to the browser's own defaults (custom properties,
`direction` and `unicode-bidi` sit outside `all`, so they still cross), and one between the design
system's states and its components for a bridge that translates the other framework's theme signal
into pragma's. Territories do the work the reset stylesheet could not: each element has exactly one
owner, so nothing has to be enumerated per property, and nothing is transformed between authoring
and the browser. No markup changes hands in either direction — there is no class to add to the root
of either kind of page — and that is what makes removal a stylesheet edit and nothing else. The
adapter's lifetime is Vanilla's: there is no supported state in between, no page that has dropped the
other framework and kept the adapter, so removal is one change rather than a sequence. It drops the
other framework's import, drops the adapter and its confined copy, and swaps `tokens.css` and
`layout.css` back to the whole entry, together. Nothing is left in the templates to clean up.

The two consequences to keep in mind are that `!important` still inverts the order — so the other
framework's important rules get *stronger* when it is layered lowest, and the ones that matter have
to be answered rather than out-ranked — and that `revert` rolls back presentational attributes as
well as author rules, since the cascade places those between the reader's origin and the author's,
so an image sized by `width` and `height` attributes inside a pragma island measures its intrinsic
size instead. Both are stated where they belong, under "What this package does not fix". The adapter package,
`@canonical/styles-vanilla-adapter`, is the reference for all of it — its README carries the
numbered rules, the recipes, what the package does not fix, and symptom-first troubleshooting — and it arrives
with the coexistence release rather than with this one.

## Where each kind of statement lives

So that the next fact you add goes to one place and not to three:

| Kind | Home |
| --- | --- |
| Why the arrangement is what it is | this document |
| What is layered where, the statement, the floors and what each package guarantees | the package READMEs |
| How to change an application to fit it | [the migration guide](../how-to-guides/MIGRATE_TO_LAYERED_STYLES.md) and the adapter README |
| The rules a reviewer cites | the CSS code standards (`canonical/web-code-standards`): every rule in a named layer, one statement first, component tiers, scoped element layers, no `!important`, reserved class names, components own the box of the natives they render, and territories |
| The decision, with its measurements and the alternatives that were closed | the decision record `F.VANILLA_COEXISTENCE` in `pragma-adrs` |

A fact that has to appear twice points at its home from the other place, and the properties a browser
can be asked about are asked of one, in the adapter's fixtures.
