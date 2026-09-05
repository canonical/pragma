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
  --baseline-height: 0.25rem;
}
```

That declaration is optional. `@canonical/styles` sets `--baseline-height` itself, to `0.25rem` — four pixels at the default root font size — and `baseline-shim.css` registers the property with a `4px` initial value, so an engine linked on its own still has a grid to snap to.

Every `h1`–`h6`, `p` and `.p` **inside the marked element** then aligns to the baseline grid. The default engine uses the CSS `cap` unit and requires no JavaScript font extraction.

The `ds` class is not decoration: every rule this package ships that selects an element is written inside `@scope (.ds)`, so without it no text is styled. The next section says why.

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
| `baseline-shim.css` — the `@property` registration of `--baseline-height` | none, by design | no |
| `@canonical/design-tokens/dist/modifiers.typography.css`, imported by each engine | `ds.modifiers`, which that file opens itself | no |

`ds.typography` sits above `ds.reset` and below `ds.modifiers` in the order `@canonical/styles` declares, so the typographic scale in `ds.modifiers` can retune what the engine produces, and a component stylesheet — higher still — is always the final word on its own text.

### Why the mapper's shims are in `ds.tokens` and not scoped

They are custom properties and nothing else. A custom property does nothing where it is declared; it does something where a rule reads it, and every rule that reads these is either scoped to the marked subtree or matches a design-system class. Declaring them on `:root` therefore changes nothing outside the design system's own rules, and putting them beside the other primitive values — which is what `ds.tokens` holds — is where a maintainer looking for a token name will look. They exist because `modifiers.typography.css` references kebab-case names that `sets.primitive.css` emits in camelCase; they go away when that is fixed upstream.

### Why the `@property` registration is outside every layer

A registration says what a custom property *means* for the whole document — its syntax, whether it inherits, its initial value — and it applies wherever it is written. This package registers `--baseline-height` once and nothing else registers that name, so no layer has anything to order it against: moving the registration into `ds.typography` would change no computed value. It stays at the top level with the other declarations of its kind, which is a convention that makes it easy to find rather than something the cascade requires.

That distinction is worth drawing, because three plausible-sounding claims about layers and at-rules are false, and all three were measured false in Chromium 151 and Firefox 153. A browser does **not** reject `@property` inside `@layer` or inside `@scope`: both engines keep the registration and apply its initial value. Registrations are **not** exempt from layer order: given two registrations of the same name, the one in the higher layer wins even when it is written first, and an unlayered one beats a layered one written after it. And `@font-face` and `@keyframes` behave the same way — the higher layer's font face or animation wins over the later one in source order. So the reason this registration is unlayered is that it is the only one of its name, not that a layer could not sort it.

### The root contract

`@scope (.ds)` makes the marked element the scoping root, and everything inside it the design system's territory. In an application that is the design system's throughout, the mark goes on the document element, beside the context and density classes it already carries:

```html
<html class="ds app comfortable">
```

In an application that is only partly the design system's, the mark goes on each region or component that has been migrated, and the engine styles the text inside it while the rest of the page keeps its own.

Two consequences worth knowing:

- **A scoped selector never matches its own scoping root.** So the rule that used to target `body` is written `:where(:scope:not(.ds *))` — the outermost marked element. The `:not(.ds *)` matters because every component carries `ds` on its own root and so opens a scope of its own: a bare `:where(:scope)` would put the base font on every component, and a Card inside a container that sets a font of its own would lose it. The base font belongs to the element that opens the territory, and everything inside inherits it. It is the same token, in the same shape, as the root rule in `@canonical/styles`' reset one layer below, so the two cannot disagree. The engines' own custom properties keep a plain `:where(:scope)`, because a nested root re-declaring the same value is inert and a region root needs them.
- **A class the engine styles may be carried by the marked element itself**, and then the bare selector misses it. `.p`, `.code` and `.editorial` are therefore written twice, bare and `:scope.x`. The complete inventory, grepped over the React, Svelte and Lit packages: a Field error and a Field description are `<p class="ds field-error p">` and `<p class="ds field-description p">`, a Range input's readout is `<output class="ds range-output p">`, an inline code span is `<code class="ds inline-code code">`, a keyboard key is `<kbd class="ds keyboard-key code">` in React and `<kbd class="ds keyboard-key surface code">` in Svelte, and `editorial` is a class an adopter puts on the region they migrate, which is that region's root. `h1`–`h6` have no such twin, because nothing renders a heading as a territory root — put the mark on the region, not on one heading inside it. A heading that is itself the marked element is not styled by the engine.

### Using an engine on its own

This package states no layer order of its own. It does not need one: it is imported by `@canonical/styles` after that package's order statement, which is the first rule of the first stylesheet and names both `ds.tokens` and `ds.typography`.

Linked on its own — which is what the example in `example/` does, and what the engine comparison in the "Engines" section below assumes — the layers are created where they first appear. That is well defined for a single package, and it settles nothing this package needs settled: no custom property is declared in more than one of the three layers involved (`ds.modifiers` from the design tokens, `ds.tokens` for the shims, `ds.typography` for the rules), so their relative order cannot change a computed value. An application that loads this package next to CSS of its own should load `@canonical/styles` and get the statement with it.

One caveat for anyone linking an engine from a plain HTML file, as the example does: the engines import `@canonical/design-tokens/dist/modifiers.typography.css` by its bare package name, which a browser cannot resolve on its own. In the example that import 404s and `ds.modifiers` is never created, so the example drives the engine with per-element variables of its own instead of the typographic scale. Anything with an import resolver — a bundler, or a pipeline running `postcss-import` — resolves it normally.

## What this package guarantees

| Guarantee | The check behind it |
| --- | --- |
| Every rule ships in `ds.tokens` or `ds.typography`; the only thing outside a layer is the `@property` registration, and it survives parsing as a live registration rather than being dropped. | The order fixtures in `@canonical/styles-vanilla-adapter` (`packages/styles/vanilla-adapter/tests/order.test.ts`) read the resolved `@canonical/styles` stylesheet back and check every layer it opens against the statement. A check inside `@canonical/styles` that the layer set used equals the layer set declared is being added separately (step F-3 of the cascade programme). |
| Nothing this package ships styles an element outside a marked subtree. | `packages/styles/vanilla-adapter/tests/vanilla-territory.test.ts`, which renders a page carrying both this design system and another CSS framework, compares every longhand on every element against the same page without the design system — `html` and `body` included — at 1280 and 1700 pixels and on two framework versions. |
| Inside a marked subtree, text computes as it does on a page that is the design system's throughout. | `packages/styles/vanilla-adapter/tests/territory.test.ts`, over the same property list. |
| The package ships no `!important`. | The same fixture files. An important declaration inverts the layer order — the lowest layer would win — so one of them would undo the guarantee above. |

## What this package does not guarantee

- **Below the `@scope` floor, none of it applies.** A browser that does not understand `@scope` drops the whole block; components stay styled, and text falls back to the browser's own defaults. See the browser table at the end.
- **Unlayered application CSS beats every rule here**, as the cascade defines. That is the escape hatch, and the reason an application that wants this order to hold for its own CSS puts that CSS in a layer of its own.

## How It Works

The browser adds invisible **half-leading** above and below each line of text. The exact amount depends on the font's internal metrics, the computed `font-size`, and `line-height`. This makes vertical alignment between different text elements unpredictable.

The baseline engines solve this by computing where the first baseline falls within a line box, then splitting one grid unit between the top and the bottom of the element's own box: `padding-block-start` takes the start nudge, which pushes the first baseline onto a grid line, and `padding-block-end` takes the remainder, `--baseline-height - --start-nudge`, so the element's block size stays a whole number of grid units. Both nudges are padding, not margin, so the border-box size is the one that lands on the grid and the element behaves in flex and grid layouts. `margin-block-end` is left for `--space-after`, the element-owned editorial spacing, which is `0` outside an `.editorial` context.

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

The `mod()` CSS function does the heavy lifting. The engines call the two halves `--start-nudge` and `--end-nudge`:

```css
--start-nudge: calc(
  var(--baseline-height) -
  mod(var(--baseline-position), var(--baseline-height))
);
--end-nudge: calc(var(--baseline-height) - var(--start-nudge));
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

Set the three metrics on `:root` as shown. The engine derives its own variables from them on the marked element rather than on `:root`, so that the derivation runs wherever the metrics are visible — which is what lets a region carry metrics of its own. Measured: with the derivation on `:root`, metrics declared on a region root produced nothing at all (`--natural-line-height` empty, no nudge); on the marked element they work, and metrics declared on `:root` still reach it by inheritance and compute exactly as before.

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
| `--baseline-height` | `:root` or the marked element | Grid unit size (`0.25rem` in `@canonical/styles`; `4px` if nothing declares it) |
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

The mapper converts these into the engine variables for each element (`h1`–`h6`, `p`, `.p`, `.code`). It sets `--line-height` as a length, not a multiplier: it prefers the exact dimension the design tokens carry, and falls back to the ratio snapped up onto the grid.

```css
--line-height: var(
  --typography-heading-1-line-height-dimension,
  round(
    up,
    calc(
      var(--typography-heading-1-font-size) *
      var(--typography-heading-1-line-height)
    ),
    var(--baseline-height)
  )
);
```

`--line-height-multiplier` is the other half of the contract, for a consumer that drives the engine directly rather than through the mapper: an engine reads `--line-height` if it is set and `calc(--baseline-height * --line-height-multiplier)` if it is not. The example uses the multiplier; the mapper uses the length.

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
| `@scope` | every element rule in this package | 118 | 17.4 | 146 |
| `mod()` | all three engines | 125 | 17.4 | 128 |
| `round()` | the mapper's line-height fallback | 125 | 17.4 | 128 |
| `@property` | the `--baseline-height` registration | 85 | 16.4 | 128 |
| `cap` unit | the cap and text-trim engines | 117 | 17.2 | 97 |
| `text-box-trim` | the text-trim engine only | 133 | 18.2 | not yet |

`@scope` is the binding floor: below it the whole block is dropped, so the engines and the element rules do not apply. What survives is what is outside the scope — the mapper's token shims in `ds.tokens`, and the `--baseline-height` registration — which style nothing on their own. The design system targets current browsers and does not carry compatibility shims for older ones; an application that cannot move should pin a version.
