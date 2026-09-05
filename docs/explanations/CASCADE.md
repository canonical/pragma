# The cascade contract

This is for the person who maintains one of pragma's stylesheets. It explains why the design system's
CSS is arranged the way it is, so that the next rule you write lands where the rest of the system
expects it, and so that you can tell a deliberate arrangement from an accident when you read someone
else's file.

It is the reasoning, not the reference. What is layered where, which files open which layer, which
browser floors apply and which guarantees have a test behind them live in the package READMEs —
[`@canonical/styles`](../../packages/styles/main/README.md#cascade-layers) and
[`@canonical/styles-typography`](../../packages/styles/typography/README.md#cascade-layers-and-scope)
— and a test reads the first of those back out of the file and compares it with the stylesheet a
bundler resolves. Where the same fact appears here and there, the README is the one that is checked.

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
That is why the styles package ships none, and why the guarantee that it ships none is one a test
checks rather than one a README asserts. One important declaration is still left elsewhere in pragma,
a margin on the Tooltip; removing it belongs to the hygiene step of the same programme.

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
pragma had to do was make its own declared contract real: every rule it ships in a named layer, one
statement fixing their order, and the rules that select bare elements confined to the part of the page
pragma owns.

## One statement, ten names

Layer order is settled by first appearance. A layer that first appears in whichever file a bundler
happened to emit first takes a position nobody chose, and once a layer exists a later statement can add
names after it but can never reorder it. One statement, first, is the only arrangement in which the
order is a decision instead of an accident — so pragma's entry point opens with it, and an `@import`
is legal after it because a layer statement and `@charset` are the only rules an import may follow:

```css
@layer normalize, ds.tokens, ds.reset, ds.typography, ds.modifiers, ds.surfaces,
  ds.states, ds.components, ds.components.global, ds.components.app;
```

(The [README's layer table](../../packages/styles/main/README.md#cascade-layers) is the reference for
what goes in each of them, and the test binds it to the stylesheet.)

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
- **The root's baseline** — the font, colour, line height and box sizing the outermost marked element
  declares for itself — sits above the tokens because it reads them, and below the typographic engine
  and the components, which refine what it starts.
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
beats `@layer ds.components.app { .thing { … } }` no matter what the statement says. Measured, and the
reason pragma's layout presets moved out of the parent layer and into the global tier: a component
package could not override them by layer, only by specificity, which is the failure the layers were
meant to end.

The rule for a maintainer is short: if you are writing a component rule, name a tier. The styles
package holds to it and its test enforces it there; one sheet in the form package still writes a
layout preset straight into `ds.components`, and the change that wraps the component stylesheets by
tier folds it into a tier with the rest.

### Both tiers are named in the statement

`ds.components.global` is for the global component packages' stylesheets; `ds.components.app` is for
the application tiers', so that an application tier arbitrating a component it also ships wins by
layer rather than by whichever package a bundler loaded last. (The component packages are being
wrapped in their tier separately; until they are, the styles package's own layout presets are what
sits in the global tier, and the README's guarantees say which of the two is still empty.) That
ordering only holds because both names appear in the statement. A sublayer left to a
`@layer ds.components.app { … }` block somewhere in the tree takes its position from whichever file
opened it first, which is exactly the bundler-order dependency the statement exists to remove.

One related trap, measured: importing a stylesheet with `@import url("…") layer(L)` when that
stylesheet itself opens `L` nests it as `L.L` — a sublayer that loses to `L`'s own rules. Pragma's own
sheets carry their layers, so its imports are bare; the `layer()` keyword on an import is for a
third-party file that carries none.

## Why the element-level layers are scoped

Layers settle who wins a fight. They do not stop a fight from reaching an element that should never
have been in it. Pragma's reset and its typographic engine select bare elements — `p`, `h1`, `input`,
the root itself — and on a page pragma does not own in its entirety, those rules would restyle
someone else's markup, in a fight no layer ordering can settle because both systems are talking about
the same `<p>`.

So the layers whose rules select elements are written inside `@scope (.ds)` blocks at their source:
the reset and the typographic engine, and the layout presets for a neighbouring reason — their class
names are ordinary enough that a page pragma does not own may already use them for something else.
Everything inside an element carrying the class `ds` is pragma's; everything outside it is not. That
gives every element exactly one owner, and the question of who wins never arises.

Two things follow from writing it that way rather than applying it afterwards. Pragma adds no
transform of its own between what a contributor writes and what the browser runs, which is the
constitution's rule about [no magic](../../CONSTITUTION.md) — the stylesheet in the source is the
stylesheet in the browser. (A consumer's minifier may still rewrite it, which is its own section
below.) And a block that says `@scope (.ds)` once is what a contributor who does nothing special will
get right on the next rule they add; the alternative, appending a guard selector to every rule by
hand, is one forgotten suffix away from a leak.

The price is a browser floor, and it is narrower than it sounds: on Chrome and Safari the typographic
engine already required more than `@scope` does, so only Firefox's floor rises. Below it a browser
drops the scoped blocks whole — the baseline, the engine's element rules and the layout presets, inside
components as well as between them — while the components' own rules stay. The README's browser table
is the reference, and the package states that failure mode as a non-guarantee rather than leaving a
reader to discover it.

### The outermost root declares the baseline

Keeping another system's *rules* out of pragma territory does not keep its *inherited values* out. A
host page that sets a colour, a font, a line height or a weight on its document element hands those
down to every pragma component inside it, and reverting declarations cannot undo an inherited value.
So the territory root declares pragma's baseline itself — which is what pragma's root should always
have declared, and what makes a pragma region render as pragma's own wherever it is placed.

A scoped selector is relative to its root and never matches that root, so the rule that reaches the
root names `:scope`. But it must name it carefully. Every pragma component carries `ds` on its own
root — bar three work-in-progress grid components the README names — so **a bare `:scope` matches
every element carrying the class** — each component is a scoping
root of its own — and the baseline would land on all of them: an icon inside a coloured link would
reset to the baseline colour instead of inheriting the link's, a card inside a card would lose its
container's font. Measured, in review, exactly like that. The baseline belongs to the element that
*opens* the territory, so the selector says so: `:where(:scope:not(.ds *))`, the outermost marked
element and only that one. Everything inside inherits from it, which is the point.

Note what this does *not* rely on: scope proximity. Proximity is a real cascade criterion, but it is
consulted after specificity and only between rules scoped to different roots, so it is too subtle a
thing to hang a baseline on. Qualifying the selector says what is meant, in the selector, where the
next maintainer will read it.

### `:root` inside a scope matches nothing

Also measured, and worth knowing before you spend an afternoon on it: a `:root` selector inside
`@scope (.ds)` matches nothing at all, even when `ds` is on `<html>`. Every bare selector inside the
block is read relative to the scoping root — as a descendant of it — and the document element is
nobody's descendant. Token blocks that stay with
the file that reads them therefore sit inside their layer and outside any scope — which costs nothing,
because a custom property does nothing where it is declared, only where a rule reads it, and every
rule that reads one is either scoped or matches a design-system class.

### One rule opts out of the scope form

The border-box declaration is written the long way — a `:where(.ds, .ds *)` selector in the same
layer, outside the scope block. It is the only rule in the package with universal reach, so every
element on the page is a candidate for it and each candidate would pay a scope-activation check; the
regression was measured on a large page, and the README records the number under
[why the element-level layers are scoped](../../packages/styles/main/README.md#why-the-element-level-layers-are-scoped).
The match set, the specificity and the layer are identical either way, which is what makes the swap
safe. Nothing else in the package takes that form, and a new rule should not take it without a
measurement.

## What stays outside a layer

Two things, and the reason is not the one most people give.

`@font-face` and `@property` define a *name* — a font family, a registered custom property — rather
than declaring style on an element. There is nothing in them for an unlayered rule to win with, so
leaving them at the top level creates none of the hazard that an unlayered style rule does. Pragma
writes them beside the other declarations of their kind, which makes them easy to find. (Not quite
none: pragma's unlayered registration would out-rank a consumer's layered registration of the same
name. That is a corner nobody is standing in.)

The claim to avoid is that layers cannot sort them. They can, and it was measured in current Chromium
and Firefox: given two registrations of the same property name, or two font faces of the same family,
the one in the higher layer wins even when it is written first, and an unlayered one beats a layered
one written after it. The reason pragma's are unlayered is that there is exactly one of each name, so
no layer has anything to order it against — not that a layer would be ignored.

The consequence for a maintainer: if you ever ship a second registration or a second face of the same
name, you are relying on layer order whether you meant to or not, and it should be layered on purpose.

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
[migration guide](../how-to-guides/MIGRATE_TO_LAYERED_STYLES.md#3-check-the-layers-on-a-built-page)
carries the snippet that reads that sequence out of a live page. Pragma's own check works one step
earlier — on the stylesheet a bundler resolves, before a minifier rewrites it, where the statement is
still the first rule and every layer it opens can be compared with the README's tables.

One more thing a bundler cannot fix: an aggregate stylesheet imported first does not pin a rule's
position on such a build, because the duplicate that survives is the last one. Position stops mattering
once the component sheets carry their tier, which is the point of carrying it.

## Living beside another framework

A page that runs pragma and another CSS framework at once gets one more layer at the bottom for that
framework, one directly above it that reverts what the framework declared inside pragma territory back
to the browser's own defaults (custom properties, `direction` and `unicode-bidi` sit outside `all`, so
they still cross), and one between the design system's states and its components for a bridge that translates
the other framework's theme signal into pragma's. Territories do the work the reset stylesheet could
not: each element has exactly one owner, so nothing has to be enumerated per property, and nothing is
transformed between authoring and the browser. The two consequences to keep in mind are that
`!important` still inverts the order — so the other framework's important rules get *stronger* when it
is layered lowest, and the ones that matter have to be answered rather than out-ranked — and that
`revert` rolls back presentational attributes as well as author rules, since the cascade places those
between the reader's origin and the author's, so an image sized by `width` and `height` attributes
inside pragma territory measures its intrinsic size instead. Both are stated as non-guarantees where
they belong. The adapter package, `@canonical/styles-vanilla-adapter`, is the reference for all of it
— its README carries the numbered rules, the recipes, the non-guarantees and symptom-first
troubleshooting — and it arrives with the coexistence release rather than with this one.

## Where each kind of statement lives

So that the next fact you add goes to one place and not to three:

| Kind | Home |
| --- | --- |
| Why the arrangement is what it is | this document |
| What is layered where, the statement, the floors, the guarantees and their tests | the package READMEs |
| How to change an application to fit it | [the migration guide](../how-to-guides/MIGRATE_TO_LAYERED_STYLES.md) and the adapter README |
| The rules a reviewer cites | the CSS code standards (`canonical/web-code-standards`): every rule in a named layer, one statement first, component tiers, scoped element layers, no `!important`, reserved class names, components own the box of the natives they render, and territories |
| The decision, with its measurements and the alternatives that were closed | the decision record `F.VANILLA_COEXISTENCE` in `pragma-adrs` |

A fact that has to appear twice points at its home from the other place, and where it can be checked
against the code, it is.
