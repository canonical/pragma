# Migrating to the layered styles release

For the maintainer of an application that already uses `@canonical/styles` and nothing else — no other
CSS framework — upgrading to the first release in which everything **that package** ships sits in a
cascade layer and its element-level rules are confined to the part of the page you mark.

Three changes need an answer from you, and none of them takes long. If your application also runs
another CSS framework on the same pages, this guide is not enough on its own: you need the adapter
package as well, `@canonical/styles-vanilla-adapter`, which arrives with the coexistence release. Its
README supersedes step 1 here — during that migration your root carries the context, the density and
`light`, and gets `ds` only at the very end.

Background reading, if you want the reasoning rather than the steps:
[the cascade contract](../explanations/CASCADE.md).

## What changed

Before this release the layer statement in the design system's entry point named four layers that
almost nothing was written into, so its rules competed with yours on specificity and on load order.
Now every rule it ships is in one of ten named layers whose order one statement fixes, and the rules
that select bare elements — the reset and the typographic engine, and the layout presets with them —
only apply inside an element carrying the class `ds`.

That is `@canonical/styles` and the typographic engine it brings with it. The component packages'
stylesheets move into the two component tiers in a separate change; until that lands they are still
unlayered, and they still meet your CSS on specificity and source order rather than on layers.

That produces exactly three questions: where your territory starts, what your own CSS should do now
that it outranks the package, and how to confirm both on a real build.

## 1. Mark your root

Add `ds` beside the context and density classes your root already carries:

```html
<html class="ds app comfortable">
```

Without it the reset and the typographic engine apply nowhere, and your page's text falls back to the
browser's defaults. Components keep working — every component carries `ds` on its own root, so each is
its own small territory — but everything between them stops being the design system's.

Mark `<html>` if you can, or `<body>`: both put the body inside the territory, so its page margin is
reset as it was before. A mark further in leaves the body outside, and the browser's own page gutter
comes back for you to zero. The
[root contract in the README](../../packages/styles/main/README.md#usage) is the reference for the
three classes and for what a colour-scheme pin does.

The layout presets moved with the reset: the preset class names now do nothing outside a marked
subtree. If your markup uses one of them on an element that neither carries `ds` nor sits inside one,
that is a layout change
rather than a typographic one, and
[the README's migrating section](../../packages/styles/main/README.md#migrating-to-the-layered-release)
names the presets affected.

## 2. Decide what your own CSS does

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
  ds.components.app, app;
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
browser first, and if it is yours, `app` sits *below* everything the design system ships. See the last
troubleshooting entry.

`!important` in your CSS still wins, and among important declarations the layer order runs backwards,
so an important rule in the lowest layer is the strongest author rule on the page. Neither fact
changed, and
neither is a good tool for this job.

## 3. Check the layers on a built page

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
declared, and if you layered your own CSS in step 2, `app` never appears before a design-system name.
A name that first appears too early is the bug — usually the one in the last troubleshooting entry
below.

Then check the root in the elements panel: `<html>` (or `<body>`) carries `ds`, with a context class
and a density class on it or on some ancestor of your components — the reference application puts `ds`
on `<html>` and `app comfortable` on `<body>`.

## What else moves on the page

A small, closed set of computed values changes, and nothing else moves. Every one of them is measured,
listed and explained in
[the README's "What moves on the page" table](../../packages/styles/main/README.md#what-moves-on-the-page)
— read it before you go looking for a regression, because each entry in it moves for a reason the
release intends.

One dependency change rides along: the design system no longer depends on the `normalize.css` package,
because it writes its own reset so that the reset can be scoped. If your application was getting that
file through us and wants the rest of it, depend on it directly.

## If you import a subpath

A subpath — one of the individual stylesheets the package exports, rather than the package entry —
carries **no order statement**, because the statement is the first rule of the entry. The layers such a
file opens are then ordered by wherever they first appear among your own rules, which is the accident
the statement exists to remove. One of those subpaths now also brings a `@scope (.ds)` block with it.

Import the package entry unless you have a specific reason not to; if you must import a subpath, write
the statement yourself, as in step 2.

## The browser floor moved

The scoped blocks need `@scope`. On Chrome and Safari that is below what the typographic engine
already required, so nothing moves there; on Firefox the floor rises. The versions are in
[the README's browser-floor table](../../packages/styles/main/README.md#browser-floor), beside the
features the engine already needed.

Below the floor a browser drops the scoped blocks whole: the root's baseline, the typographic engine's
element rules and the layout presets do not apply — inside your components as well as between them.
The border-box rule survives, because it is deliberately written outside the scope. A few shipped
components carry a layout preset on their own root, so there the visible failure is a collapsed layout
rather than only default text. If your application supports a browser below the floor, pin the previous
release rather than shipping the scoped one.

## Troubleshooting

### Text lost its font, its line height or its colour — but the components look right

The element is outside the territory. Everything the reset and the typographic engine do is now
confined to a subtree marked with `ds`, and components carry their own mark, which is why they survived
while the page around them did not.

Check the document element in devtools for the `ds` class. If it is on a wrapper further in — a
`<main>`, a mounted app root — then anything outside that wrapper, header and footer included, is
outside the territory. Move the mark up, or mark each region you own. If the class is there and the
text is still unstyled, check the browser floor above: below it the scoped blocks are dropped whole,
and the text inside your components goes with them — so if the components' own text also looks like
the browser's defaults, suspect the floor rather than the mark.

### An 8px gutter came back around the page

The mark is on a subtree rather than on `<html>` or `<body>`, so the body is outside the territory and
the browser's own default margin on it is no longer reset. This is stated as a non-guarantee rather
than a bug: the reset only reaches what you marked.

Either move `ds` up to `<html>` (the recommended shape for an application that is the design system's
throughout) or zero the body margin yourself in your own CSS.

### Your overrides stopped winning once you layered them

Layering your CSS moved it from "beats everything" to "wherever its layer happens to rank" — and if
you wrapped your rules in `@layer app { … }` without naming `app` in a statement of your own, its rank
was decided by first appearance. When your stylesheet reaches the browser before the design system's
entry, `app` is established first and every design-system layer is appended *above* it — so wherever
the design system also sets that property on that element, your rule now loses, however specific it
is.

Run the devtools snippet from step 3: if `app` comes back first in the list instead of last, that is
this. The fix is the statement in step 2, written before the import — it fixes the rank of `app`
whatever the load order, which is the whole reason to write one. Removing the `@layer app` wrapper is
the other valid fix: unlayered, your CSS wins again.

## Related

- [The cascade contract](../explanations/CASCADE.md) — why the order is what it is.
- [`@canonical/styles` README](../../packages/styles/main/README.md) — what is layered where, the
  guarantees and the tests behind them.
- [`@canonical/styles-typography` README](../../packages/styles/typography/README.md) — the engines'
  layer and scope, for an application that imports one directly.
