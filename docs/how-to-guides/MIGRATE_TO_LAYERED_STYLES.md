# Migrating to the layered styles release

For the maintainer of an application that already uses `@canonical/styles` and nothing else — no other
CSS framework — upgrading to the first release in which everything that package ships sits in a
cascade layer.

**Nothing in your markup changes, and no class is added to any root.** You import `@canonical/styles`
as you always did, and the rules that style bare elements — the reset, the root's baseline, the typographic
engine — still apply to your whole page, written plainly, the way they always were. What does change
is how your own CSS meets the design system's, and that needs an answer from you.

If your application also runs another CSS framework on the same pages, this guide is not enough on its
own. Your imports change there — two of this package's smaller entries in place of the whole, plus
the adapter package's confined copy of the element rules — and `@canonical/styles-vanilla-adapter`'s
README owns that recipe. It arrives with the coexistence release.

Background reading, if you want the reasoning rather than the steps:
[the cascade contract](../explanations/STYLES_CASCADE.md).

## What changed

Before this release the layer statement in the design system's entry point named four layers that
almost nothing was written into, so its rules competed with yours on specificity and on load order.
Now every rule it ships that declares style is in one of thirteen named layers whose order one
statement fixes. (`@font-face` stays outside them, deliberately: it names a font rather than styling
an element, so no layer has anything to sort it against.)

Three of those thirteen style bare elements, and they stay exactly as plain as they were: no scope, no
marker class, no condition. Your paragraphs, headings and controls are styled because of what they
are, page-wide, as before.

That is `@canonical/styles` and the typographic engine it brings with it. The component packages'
stylesheets move into the two component tiers in a separate change; until that lands they are still
unlayered, and they still meet your CSS on specificity and source order rather than on layers.

So there is one decision to take and one thing to check.

## 1. Decide what your own CSS does

**Your unlayered CSS now beats every rule `@canonical/styles` ships.** That is the cascade working as
defined — a rule in no layer outranks a rule in any layer, whatever the selectors on either side — and
before this release it was not true, because most of what that package shipped was unlayered too and
your overrides sometimes lost. Against it they cannot lose any more. If you were relying on one of its
rules to win a tie, it will not. (The component packages are the exception until their stylesheets are
wrapped: those are still unlayered, so they still meet your CSS the old way.)

Two answers are valid.

**Accept it.** Your stylesheet wins, everywhere, and that needs no work at all. It is a reasonable
choice for an application with a handful of overrides.

**Or put your CSS in a layer**, so that its position is a decision rather than a side effect of
whatever your bundler emits first. Write your own statement, naming your layer last, before the design
system's import:

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

The order of those names is the design system's own, taken from
[the README's cascade section](../../packages/styles/main/README.md#cascade-layers), with `app` added
at the end. Naming them all is what makes the position of `app` yours: a layer's rank is fixed the
first time it is named, and a statement that comes later may add names but can never reorder the ones
already fixed. With `app` last, your rules beat every design-system layer *by layer* — and a rule of
yours that you later want a component to override can simply be moved into a lower layer instead of
being deleted or fought with a longer selector.

Skipping the statement and writing only `@layer app { … }` is the one arrangement that bites: the
position of `app` is then decided by whether your block or the design system's import reaches the
browser first, and if it is yours, `app` sits *below* everything the design system ships. See the
first troubleshooting entry.

`!important` in your CSS still wins, and among important declarations the layer order runs backwards,
so an important rule in the lowest layer is the strongest author rule on the page. Neither fact
changed, and neither is a good tool for this job.

## 2. Check the layers on a built page

Do not grep your built CSS for the statement. A minifier rewrites it: Lightning CSS, which pragma's
own reference build configures Vite to use, merges the blocks that share a layer name, reorders them
into the order the statement declared, deletes the statement, and emits a statement only for a
declared name that no block establishes. The order survives; the text does not.

Read the layers from the page instead. In devtools, on a page that has loaded your stylesheet:

```js
[...document.styleSheets]
  // A stylesheet served from another origin refuses to be read; skip it.
  .flatMap((sheet) => { try { return [...sheet.cssRules]; } catch { return []; } })
  .filter((rule) => rule instanceof CSSLayerBlockRule || rule instanceof CSSLayerStatementRule)
  .map((rule) => rule.name ?? rule.nameList.join(", "));
```

What comes back depends on whether the build kept the statement. If it did, the first entry is the
statement itself — every name, in the order it declared them — followed by one entry per layer block,
in the order the browser read the files, which is not the declared order and does not need to be. If a
minifier deleted the statement, the blocks themselves come back in the declared order. Either way the
property to check is the same one: the **first** appearance of each name follows the order you
declared, and if you layered your own CSS in step 1, `app` never appears before a design-system name.
A name that first appears too early is the bug — the first troubleshooting entry below.

Then check the root in the elements panel: a context class and a density class, on `<html>` or on any
ancestor of the components that read them. That is the whole root contract, and this release does not
add to it.

## What else moves on the page

A small, closed set of computed values changes, and nothing else moves. Every one of them is measured,
listed and explained in
[the README's "What moves on the page" table](../../packages/styles/main/README.md#what-moves-on-the-page)
— read it before you go looking for a regression, because each entry in it moves for a reason the
release intends.

One dependency change rides along: the design system no longer depends on the `normalize.css` package,
because it writes its own reset, containing only the rules the system relies on. If your application
was getting that file through us and wants the rest of it, depend on it directly.

## The entries, and everything else

The package has four **entries**: `@canonical/styles` is the whole of it, and `tokens.css` (four layers
of values, and the classes that set them), `elements.css` (what bare elements get) and `layout.css`
(the layout presets) are that same stylesheet in parts. Each of the four opens with the order
statement, and none imports another, so any of them is safe to import on its own and in any order. The
three smaller ones exist for a page that also runs another CSS framework and takes its element rules
from the adapter instead; if that is not you, the package entry is your import, as it always was.

There is also `layers.css`, which is the order statement and nothing else, and which is where the
order is declared: every entry above imports it as its first rule rather than repeating the list. An
application does not need it — importing any entry brings it — but a package that declares a cascade
layer of its own imports it first, so that its layer is named after the design system's and therefore
ranks above them. The cascade contract has the recipe.

Anything below an entry is a leaf stylesheet, and a leaf **carries no order statement**, because the
order arrives through the entry that imports it. The layers such a file opens are ordered by wherever they first
appear among your own rules, which is the accident the statement exists to remove. If you have a
reason to reach past the entries, write the statement yourself, as in step 1.

## The browser floor

**It did not move for you.** Your floor is what the typographic engine already required —
[the README's browser-floor table](../../packages/styles/main/README.md#browser-floor) lists it — and
this release adds nothing to it.

`@scope`, whose floor is newer, appears in exactly one file in the whole system: the adapter's copy of
the element rules, which only a page running two CSS frameworks imports. If you ever become such a
page, that floor becomes yours, and below it a browser drops the copy whole — components keep their
own styles while the text inside them falls back to the browser's.

## Troubleshooting

### Your overrides stopped winning once you layered them

Layering your CSS moved it from "beats everything" to "wherever its layer happens to rank" — and if
you wrapped your rules in `@layer app { … }` without naming `app` in a statement of your own, its rank
was decided by first appearance. When your stylesheet reaches the browser before the design system's
entry, `app` is established first and every design-system layer is appended *above* it — so wherever
the design system also sets that property on that element, your rule now loses, however specific it
is.

Run the devtools snippet from step 2: if `app` comes back first in the list instead of last, that is
this. The fix is the statement in step 1, written before the import — it fixes the rank of `app`
whatever the load order, which is the whole reason to write one. Removing the `@layer app` wrapper is
the other valid fix: unlayered, your CSS wins again.

### The design system's text styles reached markup another framework owns

This is the mixed-page symptom, and it means the page imported the wrong entry. `@canonical/styles`
carries the three element layers, and they style every paragraph, heading and control on the page,
including the ones that belong to the other framework.

A page that runs both takes `tokens.css` and `layout.css` from this package and the adapter's own
`elements.css` in place of the package's — the same three layers, confined to the subtrees that are
the design system's. The adapter README carries the import recipe for each kind of build.

### On a mixed page, the components lost their text styles

The other half of the same mistake: `tokens.css` and `layout.css` without any `elements.css` is the
design system with no element rules at all, so a component's own stylesheet still paints it while
nothing sets the text inside it. Import the adapter's `elements.css` beside them.

If both imports are there and the text is still the browser's, check the `@scope` floor above: below
it that copy is dropped whole, which produces the same symptom on every browser too old to understand
it.

## Related

- [The cascade contract](../explanations/STYLES_CASCADE.md) — why the order is what it is, and why the
  confinement for mixed pages lives in the adapter rather than here.
- [`@canonical/styles` README](../../packages/styles/main/README.md) — what is layered where, and
  what the package guarantees.
- [`@canonical/styles-typography` README](../../packages/styles/typography/README.md) — the engines
  and their layer, for an application that imports one directly.
