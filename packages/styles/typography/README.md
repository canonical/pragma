# @canonical/styles-typography

Baseline grid alignment for the Canonical Design System. This package provides three interchangeable CSS engines that snap text baselines to a configurable grid, plus a semantic token mapper that bridges `@canonical/design-tokens` typography tokens to the engine's variable contract.

This README is written for the person maintaining this package or another of the design system's stylesheets. An application author does not normally import it: `@canonical/styles` does, and the root contract and the full layer order are documented there. Where a claim here can be checked, the check is named.

## Quick Start

Import the default engine (cap-unit), mark the part of the page the design system owns, and set your baseline height:

```html
<html class="ds">
```

```css
@import url("@canonical/styles-typography");

:root {
  --baseline-height: 0.5rem;
}
```

Every `h1`–`h6`, `p` and `.p` **inside the marked element** then aligns to the baseline grid. The default engine uses the CSS `cap` unit and requires no JavaScript font extraction.

The `ds` class is not decoration: every rule this package ships is written inside `@scope (.ds)`, so without it nothing is styled. The next section says why.

## Cascade layers and scope

Two facts about the CSS cascade shape this whole package.

A rule in no cascade layer outranks a rule in any layer, whatever the selectors on either side. And within one layer, two rules of equal specificity are settled by which one loaded second. This package used to ship its rules in no layer at all, at specificity `(0,0,1)` — `p`, `h1`, `body`. On a page that also loads another CSS framework with its own `p` rule, whichever stylesheet loaded second owned `line-height`, `padding-top` and `margin-bottom`, while every property only the other one declared leaked through. The paragraph that resulted was designed by neither system.

So the rules are layered, and the ones that select elements are confined to the part of the page the design system owns.

### What is in which layer

| What | Layer | Inside `@scope (.ds)`? |
| --- | --- | --- |
| `mapper.css` — the design-tokens naming shims (`:root`, custom properties only) | `ds.tokens` | no |
| `mapper.css` — the root font rule and the `h1`–`h6`, `p`, `.p`, `.code`, `.editorial` rules | `ds.typography` | yes |
| `baseline-cap.css`, `baseline-metrics.css`, `baseline-trim.css` — every rule | `ds.typography` | yes |
| `baseline-shim.css` — the `@property` registration | none, by design | no |
| `@canonical/design-tokens/dist/modifiers.typography.css`, imported by each engine | `ds.modifiers`, which that file opens itself | no |

`ds.typography` sits above `ds.reset` and below `ds.modifiers` in the order `@canonical/styles` declares, so the typographic scale in `ds.modifiers` can retune what the engine produces, and a component stylesheet — higher still — is always the final word on its own text.

### Why the mapper's shims are in `ds.tokens` and not scoped

They are custom properties and nothing else. A custom property does nothing where it is declared; it does something where a rule reads it, and every rule that reads these is either scoped to the marked subtree or matches a design-system class. Declaring them on `:root` therefore changes nothing outside the design system's own rules, and putting them beside the other primitive values — which is what `ds.tokens` holds — is where a maintainer looking for a token name will look. They exist because `modifiers.typography.css` references kebab-case names that `sets.primitive.css` emits in camelCase; they go away when that is fixed upstream.

### Why the `@property` registration is outside every layer

A registration is not a style rule. It says what a custom property *means* for the whole document — its syntax, whether it inherits, its initial value — and nothing about it is sorted by the cascade, so a layer would have nothing to order it against and a scope would have no subtree to confine it to. Engines have also rejected `@property` nested inside a layer. `@font-face` and `@keyframes` are outside the layers for the same reason, and `@canonical/styles`' README lists all three under "what is deliberately unlayered".

### The root contract

`@scope (.ds)` makes the marked element the scoping root, and everything inside it the design system's territory. In an application that is the design system's throughout, the mark goes on the document element, beside the context and density classes it already carries:

```html
<html class="ds app comfortable">
```

In an application that is only partly the design system's, the mark goes on each region or component that has been migrated, and the engine styles the text inside it while the rest of the page keeps its own.

Two consequences worth knowing:

- **A scoped selector never matches its own scoping root.** So the rule that used to target `body` is written `:where(:scope)` — the marked element itself. It declares the same base font token as the root rule in `@canonical/styles`' reset, so the two cannot disagree.
- **A class the engine styles may be carried by the marked element itself**, and then the bare selector misses it. `.p`, `.code` and `.editorial` are therefore written twice, bare and `:scope.x`: a Field error and a Field description are `<p class="ds field-error p">`, an inline code span is `<code class="ds inline-code code">`, a keyboard key is `<kbd class="ds keyboard-key code">`, and `editorial` is a class an adopter puts on the region they migrate, which is that region's root. `h1`–`h6` have no such twin, because nothing renders a heading as a territory root — put the mark on the region, not on one heading inside it. A heading that is itself the marked element is not styled by the engine.

### Using an engine on its own

This package states no layer order of its own. It does not need one: it is imported by `@canonical/styles` after that package's order statement, which is the first rule of the first stylesheet and names both `ds.tokens` and `ds.typography`.

Linked on its own — which is what the example in `example/` does, and what the engine comparison in the "Engines" section below assumes — the layers are created where they first appear. That is well defined for a single package, and it settles nothing this package needs settled: no custom property is declared in more than one of the three layers involved (`ds.modifiers` from the design tokens, `ds.tokens` for the shims, `ds.typography` for the rules), so their relative order cannot change a computed value. An application that loads this package next to CSS of its own should load `@canonical/styles` and get the statement with it.

## What this package guarantees

| Guarantee | The check behind it |
| --- | --- |
| Every rule ships in `ds.tokens` or `ds.typography`; the only thing outside a layer is the `@property` registration. | The order fixtures in `@canonical/styles-vanilla-adapter` (`packages/styles/vanilla-adapter/tests/order.test.ts`) read the resolved `@canonical/styles` stylesheet back and check every layer it opens against the statement. A check inside `@canonical/styles` that the layer set used equals the layer set declared is being added separately (step F-3 of the cascade programme). |
| Nothing this package ships styles an element outside a marked subtree. | `packages/styles/vanilla-adapter/tests/vanilla-territory.test.ts`, which renders a page carrying both this design system and another CSS framework, compares every longhand on every element against the same page without the design system — `html` and `body` included — at 1280 and 1700 pixels and on two framework versions. |
| Inside a marked subtree, text computes as it does on a page that is the design system's throughout. | `packages/styles/vanilla-adapter/tests/territory.test.ts`, over the same property list. |
| The package ships no `!important`. | The same fixture files. An important declaration inverts the layer order — the lowest layer would win — so one of them would undo the guarantee above. |

## What this package does not guarantee

- **Below the `@scope` floor, none of it applies.** A browser that does not understand `@scope` drops the whole block; components stay styled, and text falls back to the browser's own defaults. See the browser table at the end.
- **Unlayered application CSS beats every rule here**, as the cascade defines. That is the escape hatch, and the reason an application that wants this order to hold for its own CSS puts that CSS in a layer of its own.

## How It Works

The browser adds invisible **half-leading** above and below each line of text. The exact amount depends on the font's internal metrics, the computed `font-size`, and `line-height`. This makes vertical alignment between different text elements unpredictable.

The baseline engines solve this by computing where the first baseline falls within a line box, then applying a `padding-top` / `margin-bottom` pair that nudges the element so its baseline lands exactly on a grid line. The complementary `margin-bottom` ensures the element's total outer height remains a multiple of `--baseline-height`.

```
 line-height (computed)
 +----------------------------------------------+
 |  half-leading (top)                           |
 |  +----------------------------------------+  |
 |  | ascender area                           |  |
 |  | - - - - cap line - - - - - - - - - - - |  |
 |  | glyph body                              |  |
 |  | - - - - baseline - - - - - - - - - - - |  |  ← snap this to the grid
 |  | descender area                          |  |
 |  +----------------------------------------+  |
 |  half-leading (bottom)                        |
 +----------------------------------------------+
```

The `mod()` CSS function does the heavy lifting:

```css
--top-nudge: calc(
  var(--baseline-height) -
  mod(var(--baseline-position), var(--baseline-height))
);
```

Multi-line blocks stay on-grid because `line-height` is always set to a multiple of `--baseline-height`. The nudge only compensates for the first line's half-leading offset.

## Engines

Three engines implement the same grid-snap pattern with different trade-offs. Import the one that fits your constraints directly, or use `index.css` which re-exports the default (cap-unit). Each engine carries its own `@layer ds.typography { @scope (.ds) { … } }` block and its own imports, so linking one on its own is a complete engine.

### baseline-cap.css — Cap unit (default)

```css
@import url("@canonical/styles-typography/src/baseline-cap.css");
```

Uses the browser-native `cap` CSS unit to resolve font metrics at render time. No JavaScript extraction step, no per-font variables. Changing `font-family` on an element automatically updates the `1cap` value the engine uses.

The baseline position formula is `(line-height + 1cap) / 2` — the browser resolves `1cap` from the font's OpenType tables natively.

| Browser | Minimum version |
|---------|-----------------|
| Chrome  | 117+            |
| Safari  | 17.2+           |
| Firefox | 97+             |

### baseline-metrics.css — Extracted metrics

```css
@import url("@canonical/styles-typography/src/baseline-metrics.css");
```

The original engine with the widest browser support. Requires three CSS variables extracted from the font file using the `extract-font-data` CLI:

```css
:root {
  --ascender: 1068;
  --descender: -292;
  --units-per-em: 1000;
}
```

The baseline position is computed from these metrics: `((line-height - line-height-scale) / 2) + ascender-scale`. More verbose, but works everywhere `mod()` is supported.

Set the three metrics on `:root` as shown; the engine derives its own variables from them on the marked element, because `:root` inside a scope matches nothing at all — not even when the mark is on `<html>`.

### baseline-trim.css — Text-box-trim hybrid

```css
@import url("@canonical/styles-typography/src/baseline-trim.css");
```

The most modern approach. Uses `text-box: trim-both cap alphabetic` to remove half-leading entirely, then compensates with `mod()`-based margin to restore grid alignment. Results in tighter content boxes (useful for buttons, cards, optical centering).

| Browser | Minimum version | Notes |
|---------|-----------------|-------|
| Chrome  | 133+            |       |
| Safari  | 18.2+           |       |
| Firefox | —               | Not yet implemented |

Falls back gracefully: if `text-box-trim` is unsupported, the element keeps its default half-leading and the nudge still applies.

## Consumer Contract

Every engine reads the same set of CSS custom properties per element:

| Variable | Scope | Description |
|----------|-------|-------------|
| `--baseline-height` | `:root` | Grid unit size (e.g. `0.5rem`) |
| `--font-size` | element | Font size as a `<length>` |
| `--line-height-multiplier` | element | Line height in baseline-height units |
| `--line-height` | element | Optional override: explicit line height, bypasses the multiplier |
| `--space-after` | element | Optional: extra bottom margin in baseline-height units |

The **metrics engine** additionally requires on `:root`:

| Variable | Description |
|----------|-------------|
| `--ascender` | Font ascender value (unitless, from OpenType tables) |
| `--descender` | Font descender value (unitless, negative) |
| `--units-per-em` | Font units-per-em value |

These are read, not declared, by the scoped rules, so setting them on `:root` works: a custom property inherits into the marked subtree.

## Token Mapper

The `mapper.css` file bridges the semantic typography tokens from `@canonical/design-tokens` to the engine's variable contract. It is imported automatically by the default engine (`baseline-cap.css`).

The design tokens provide variables like:

```
--typography-heading-1-font-size
--typography-heading-1-line-height    (unitless ratio)
--typography-heading-1-font-weight
--typography-heading-1-letter-spacing
--typography-heading-1-font-family
```

The mapper converts these into the engine variables for each element (`h1`–`h6`, `p`), including computing `--line-height-multiplier` by snapping the typographic line-height to the nearest baseline-grid unit:

```css
--line-height-multiplier: round(
  up,
  calc(font-size × line-height-ratio / baseline-height),
  1
);
```

## Package Structure

```
src/
  index.css              ← re-exports baseline-cap.css (default)
  baseline-cap.css       ← cap-unit engine
  baseline-metrics.css   ← extracted-metrics engine
  baseline-trim.css      ← text-box-trim + cap hybrid
  baseline-shim.css      ← the --baseline-height @property registration
  mapper.css             ← semantic token → engine variable bridge
  scripts/
    extractFontData.ts   ← CLI for extracting font metrics
example/
  index.html             ← interactive demo with engine switcher
  serve.ts               ← dev server with live-reload
  scripts/               ← sidebar, font picker, content presets
  fonts/                 ← bundled .woff2 files for the demo
  styles/                ← demo layout and debug styles
```

## Extracting Font Metrics

The `extract-font-data` CLI reads OpenType metrics from a font file. This is only needed when using the **baseline-metrics** engine.

```bash
bun run extract-font-data ./path/to/font.ttf
```

Output:

```
Add the following variables to your CSS and follow the instructions in the README:
:root {
  --ascender: 1068;
  --descender: -292;
  --units-per-em: 1000;
}
```

Pass `--all` to see the full metrics table including computed nudge values for a given line-height:

```bash
bun run extract-font-data ./path/to/font.ttf 1.5 --all
```

### Caveats

The extractor uses `opentype.js` to parse font files. It works with most `.ttf`, `.otf`, and `.woff` files but may fail on fonts without TrueType or CFF outlines:

```
error: Font doesn't contain TrueType or CFF outlines.
```

## Development

Start the interactive example with live-reload:

```bash
bun run dev
```

This serves the example at [http://localhost:3333/example/](http://localhost:3333/example/). Its document element carries `class="ds"`, which is what makes the engine apply at all. The sidebar lets you:

- **Switch engines** — toggle between cap-unit, metrics, and text-trim in real time
- **Switch fonts** — pick from bundled fonts with auto-applied metrics
- **Tune per-tag** — adjust font-size, line-height multiplier, and space-after for each heading level and paragraph
- **Adjust baseline** — change the baseline grid height and see the alignment update

The baseline grid is rendered as a red 1px line overlay so alignment errors are immediately visible.

## Browser Support

| Feature | Used by | Chrome | Safari | Firefox |
|---------|---------|--------|--------|---------|
| `@scope` | every rule in this package | 118 | 17.4 | 146 |
| `mod()` | all three engines | 125 | 17.4 | 128 |
| `round()` | the mapper's line-height fallback | 125 | 17.4 | 128 |
| `@property` | the `--baseline-height` registration | 85 | 16.4 | 128 |
| `cap` unit | the cap and text-trim engines | 117 | 17.2 | 97 |
| `text-box-trim` | the text-trim engine only | 133 | 18.2 | not yet |

`@scope` is the binding floor: below it the whole block is dropped and none of this package applies. The design system targets current browsers and does not carry compatibility shims for older ones; an application that cannot move should pin a version.
