# Migrating to the layered styles release

For the maintainer of an application that already uses `@canonical/styles` and nothing else — no other
CSS framework — upgrading to the first release in which everything that package ships sits in a
cascade layer.

**Your markup does not change.** The root contract is what it always was, a context class and a
density class; this release adds nothing to it and asks for no new class on `<html>`. What does change
is how your own CSS meets the design system's, and that needs an answer from you.

If your application also runs another CSS framework on the same pages, this guide is not enough on its
own: you need the adapter package as well, `@canonical/styles-vanilla-adapter`, which arrives with the
coexistence release, and the marker and territory rules come with it.

Background reading, if you want the reasoning rather than the steps:
[the cascade contract](../explanations/CASCADE.md).

## What changed

Before this release the layer statement in the design system's entry point named four layers that
almost nothing was written into, so its rules competed with yours on specificity and on load order.
Now every rule it ships is in one of ten named layers whose order one statement fixes.

The rules that select bare elements — the reset, the typographic engine, the layout presets — are also
written inside a scope now, which opens `@scope (html:not(.coexist), .ds)`. On your page the document
element matches the first half of that, so it is a scoping root and those rules apply page-wide,
exactly as they did before. The `coexist` marker in the second half is for a page that runs two
systems, and belongs to the adapter; on a page that does not carry it, nothing about the scope is
visible to you except the browser floor further down.

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
A name that first appears too early is the bug — usually the one in the last troubleshooting entry
below.

Then check the root in the elements panel: a context class and a density class, on `<html>` or on any
ancestor of the components that read them. That is the whole root contract. If a `coexist` class is
there, something has given your page the two-system arrangement, and the first troubleshooting entry
below is for you.

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
the statement exists to remove. One of those subpaths now also brings a scope block with it.

Import the package entry unless you have a specific reason not to; if you must import a subpath, write
the statement yourself, as in step 1.

## The browser floor moved

The scoped blocks need `@scope`. On Chrome and Safari that is below what the typographic engine
already required, so nothing moves there; on Firefox the floor rises. The versions are in
[the README's browser-floor table](../../packages/styles/main/README.md#browser-floor), beside the
features the engine already needed.

What is new is that this floor reaches every page, not only a page running two systems, because the
element-level rules are inside a scope everywhere. Below it a browser drops the scoped blocks whole:
the root's baseline, the typographic engine's element rules and the layout presets do not apply —
inside your components as well as between them — while the components' own rules stay. The border-box
rule survives, because it is deliberately written outside the scope. A few shipped components carry a
layout preset on their own root, so there the visible failure is a collapsed layout rather than only
default text. If your application supports a browser below the floor, pin the previous release rather
than shipping the scoped one.

## Troubleshooting

### Text lost its font, its line height or its colour — but the components look right

Two causes. The likelier one is that your document element carries the class `coexist` — put there for
a page that runs two CSS systems, or inherited from a template that does. With that marker present the
design system's element-level rules apply only inside subtrees carrying `ds`, and every component
carries `ds` itself, which is exactly why they survived while the text around them did not.

If the marker is not meant to be there, remove it and the rules cover the page again. If it is meant
to be there, then this page is a coexistence page and the adapter README's rules apply: the region
wants a `ds` root of its own.

The other cause is the browser floor above. Below it the scoped blocks are dropped whole, and then the
text inside your components goes too — so if the components' own text also looks like the browser's
defaults, suspect the floor rather than the marker.

### The design system's typography reached markup another framework owns

The mirror image, on a page that runs both systems: the document element is missing the `coexist`
marker, so it is still a scoping root and the reset and typographic engine apply to the whole
document, legacy markup included. The symptom is the other framework's pages taking the design
system's fonts, spacing and line heights where nobody asked for them.

Add the marker to `<html>`, as the adapter README's root rule says. Marking the regions you have
already migrated with `ds` is the other half of that step: the marker alone confines the design system
without giving it anywhere to apply.

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

## Related

- [The cascade contract](../explanations/CASCADE.md) — why the order is what it is, and what the scope
  prelude does on each kind of page.
- [`@canonical/styles` README](../../packages/styles/main/README.md) — what is layered where, the
  guarantees and the tests behind them.
- [`@canonical/styles-typography` README](../../packages/styles/typography/README.md) — the engines'
  layer and scope, for an application that imports one directly.
