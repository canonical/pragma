# @canonical/styles-contract

The Canonical Design System's cascade contract, in executable form.

`@canonical/styles` makes a small number of promises about how its stylesheets compose, and they are
the kind a reader cannot check by looking at any one file. This package checks them. It is private,
never published, and has no source of its own — only tests.

## What it guards

`@canonical/styles` has four entry points: `index.css`, the whole stylesheet, and `tokens.css`,
`elements.css` and `layout.css`, which are it in three parts. The parts exist so that a page which also
runs another CSS framework can take the design system's values and layout presets without its element
rules, and get those from that framework's adapter instead, confined to the part of the page the design
system owns.

Four things have to be true for that to work, and none of them is visible in any single file:

- **the same layer order statement is the first rule of every entry** — it fixes the order of every
  layer for whichever stylesheet a page loads first, so two entries declaring different orders would
  mean the same rules arbitrating differently depending on which entry a consumer picked;
- **no entry imports another** — an `@layer` statement inside a layer block declares sublayers of that
  layer rather than top-level layers, so an entry that composed another would nest the order instead of
  repeating it;
- **`tokens.css` declares no rule that styles an element** — no tag-name selector, none of the engine's
  classes, none of the element layers opened, and no property that is not a custom property, with one
  documented exception the styles README explains;
- **each entry inlines each file exactly once, and the three parts together deliver exactly what the
  whole does** — nothing lost, nothing invented, nothing delivered twice.

The tests resolve each entry's `@import` graph the way a browser builds it, de-duplicating nothing,
because de-duplicating would hide the very defect they exist to catch.

`docs/explanations/CASCADE.md` states the contract in prose; this package is the half a machine can
check.

## Why it is not in the package it tests

`@canonical/styles` publishes stylesheets and nothing else. Holding these tests inside it would give a
CSS-only package a test runner, a compiler and a tsconfig for the sake of two files that read CSS and
compare strings — machinery that would then ship in its dependency tree and its repository footprint
for no benefit to anyone installing it.

So the subject stays clean and the checking lives here, where TypeScript and vitest are the house norm.
The dependency points the right way: this package depends on `@canonical/styles`, by its public name,
and reads the stylesheets a consumer would get.

## Running it

```bash
bun run test     # once
bun run test:watch
bun run check    # biome, then tsc
```
