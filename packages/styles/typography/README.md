# @canonical/styles-typography

Baseline grid alignment for the Canonical Design System. This package provides three interchangeable CSS engines that snap text baselines to a configurable grid, plus a semantic token mapper that bridges `@canonical/design-tokens` typography tokens to the engine's variable contract.

This README is written for the person maintaining this package or another of the design system's stylesheets. An application author does not normally import it: `@canonical/styles` does, and the full layer order is documented there. Where a claim here can be checked, the check is named.

## Quick Start

Import the default engine (cap-unit):

```css
@import url("@canonical/styles-typography");
```

Every `h1`–`h6`, `p` and `.p` in the document then aligns to the baseline grid. There is no class to add and nothing to mark: these are element rules, and they apply to the page. The default engine uses the CSS `cap` unit and requires no JavaScript font extraction.

The grid unit is `--baseline-height`. `@canonical/styles` sets it, to `0.25rem` — four pixels at the default root font size — and `baseline-shim.css` registers the property with a `4px` initial value, so an engine linked on its own still has a grid to snap to. Set it yourself if you want a different one:

```css
:root {
  --baseline-height: 0.5rem;
}
```

## Cascade layers

Two facts about the CSS cascade shape this package.

A rule in no cascade layer outranks a rule in any layer, whatever the selectors on either side. And within one layer, two rules of equal specificity are settled by which one loaded second. This package used to ship its rules in no layer at all, at specificity `(0,0,1)` — `p`, `h1`, `body` — so an application's own `p` rule tied with this one and the bundler's output order decided the winner, one property at a time. Layered, the design system loses to an application's unlayered CSS, deliberately and predictably, and beats the layers below it, also deliberately.

### What is in which layer

| What | Layer |
| --- | --- |
| `mapper.css` — the design-tokens naming shims (`:root`, custom properties only) | `ds.tokens` |
| `mapper.elements.css` — the `body`, `h1`–`h6`, `p`, `.p`, `.code` and `.editorial` rules | `ds.typography` |
| `baseline-cap.css`, `baseline-metrics.css`, `baseline-trim.css` — every rule | `ds.typography` |
| `baseline-shim.css` — the `@property` registration | none, by design |
| `@canonical/design-tokens/dist/modifiers.typography.css`, imported by `mapper.css` | `ds.modifiers`, which that file opens itself |

`ds.typography` sits above `ds.reset` and below `ds.modifiers` in the order `@canonical/styles` declares, so the typographic scale in `ds.modifiers` can retune what the engine produces, and a component stylesheet — higher still — is always the final word on its own text.

### Why the naming shims are in `ds.tokens`

They are custom properties and nothing else. A custom property does nothing where it is declared; it does something where a rule reads it. Putting them beside the other primitive values — which is what `ds.tokens` holds — is where a maintainer looking for a token name will look. They exist because `modifiers.typography.css` references kebab-case names that `sets.primitive.css` emits in camelCase; they go away when that is fixed upstream.

### Why the `@property` registration is outside every layer

A registration says what a custom property *means* for the whole document — its syntax, whether it inherits, its initial value — and it applies wherever it is written. This package registers `--baseline-height` in one file, `baseline-shim.css`, and nothing else registers that name; the import graph is arranged so that file reaches a resolved stylesheet exactly once, which the test in `@canonical/styles` checks. So no layer has anything to order it against: moving the registration into `ds.typography` would change no computed value. It stays at the top level with the other declarations of its kind, which is a convention that makes it easy to find rather than something the cascade requires.

That distinction is worth drawing, because three plausible-sounding claims about layers and at-rules are false, and all three were measured false in Chromium 151 and Firefox 153. A browser does **not** reject `@property` inside `@layer`: both engines keep the registration and apply its initial value. Registrations are **not** exempt from layer order: given two registrations of the same name, the one in the higher layer wins even when it is written first, and an unlayered one beats a layered one written after it. And `@font-face` and `@keyframes` behave the same way. So the reason this registration is unlayered is that it is the only one of its name, not that a layer could not sort it.

### These rules apply to the whole page

They select elements by name. `body`, `h1`, `p` — nothing narrows them, and nothing is meant to: a design system's typography is for the document.

A page that also runs another CSS framework has a problem with that, because the other framework has its own `p` rule and only one of them can own `line-height`. Keeping the two apart is the coexistence adapter's job, not this package's. The adapter ships its own copy of the design system's element rules, confined to the part of the page the design system owns, built from four source files: `@canonical/styles`' `normalize.css` and `reset.css`, this package's `mapper.elements.css`, and whichever of the three engines the application uses. Such a page takes `@canonical/styles/core.css` — the same stylesheet with no element rule in it — so those rules arrive once, from the adapter. Nothing in this package changes for that.

### The two halves of the mapping

The semantic mapping is two files, because a stylesheet sometimes wants one of them and not the other.

`mapper.css` is the half that styles nothing: the naming shims, the typographic scale they bridge to, and the `--baseline-height` registration every engine reads. Every rule in it declares custom properties on `:root`, and a custom property does nothing where it is declared, only where a rule reads it.

`mapper.elements.css` is the half that styles something: the rules that put those values on `body`, `h1`–`h6`, `p`, `.p`, `.code` and `.editorial`.

Both are entry points, and `index.css` is both plus the default engine. Take `mapper.css` alone when your element rules come from somewhere else — which is exactly what `@canonical/styles/core.css` does, and why the split exists: a page that also runs another CSS framework must not load `mapper.elements.css`, or the design system would restyle that framework's headings and paragraphs.

### Using an engine on its own

This package states no layer order of its own. It does not need one: it is imported by `@canonical/styles` after that package's order statement, which is the first rule of the first stylesheet and names both `ds.tokens` and `ds.typography`.

Linked on its own — which is what the example in `example/` does — the layers are created where they first appear. That is well defined for a single package, and it settles nothing this package needs settled: no custom property is declared in more than one of the three layers involved (`ds.modifiers` from the design tokens, `ds.tokens` for the shims, `ds.typography` for the rules), so their relative order cannot change a computed value. An application that loads this package next to CSS of its own should load `@canonical/styles` and get the statement with it.

One note for anyone linking an engine from a plain HTML file, as the example does: an engine imports only the `@property` shim beside it, not the typographic scale, so `ds.modifiers` is never created there and the example drives the engine with per-element variables of its own. The scale comes with `mapper.css`, whose import of `@canonical/design-tokens/dist/modifiers.typography.css` uses a bare package name that only an import resolver — a bundler, or a pipeline running `postcss-import` — resolves.

## What this package guarantees

| Guarantee | The check behind it |
| --- | --- |
| Every rule ships in `ds.tokens` or `ds.typography`; the only thing outside a layer is the `@property` registration, and it survives parsing as a live registration rather than being dropped. | The order fixtures in `@canonical/styles-vanilla-adapter` (`packages/styles/vanilla-adapter/tests/order.test.ts`) read the resolved `@canonical/styles` stylesheet back and check every layer it opens against the statement. A check inside `@canonical/styles` that the layer set used equals the layer set declared is being added separately (step F-3 of the cascade programme). |
| The mapping can be taken without the element rules, and `@canonical/styles/core.css` contains no rule that selects an element. | `packages/styles/main/tests/core.test.ts`, which resolves the whole import graph of both entry points and checks that they open the same layer order statement, that `core.css` opens no `normalize`, `ds.reset` or `ds.typography` block and has no rule with a tag-name selector or one of the engine's classes, and that splitting the mapping changed no rule of what `index.css` delivers. |
| The package ships no `!important`. | The same fixture files. An important declaration inverts the layer order — the lowest layer would win — so one of them would undo the guarantee above. |

## What this package does not guarantee

- **Below the browser floor, the engines do not run.** `mod()` is what binds; see the table at the end for what that means per engine.
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

Three engines implement the same grid-snap pattern with different trade-offs. The cap and metrics engines reach nearly the same browsers, differing only in Safari, where the cap engine needs the `cap` unit; the text-trim one asks for more. The per-engine tables below say which feature binds where. Import the one that fits your constraints directly, or use `index.css` which re-exports the default (cap-unit). Each engine carries its own `@layer ds.typography { … }` block and its own imports, so linking one on its own is a complete engine.

### baseline-cap.css — Cap unit (default)

```css
@import url("@canonical/styles-typography/src/baseline-cap.css");
```

Uses the browser-native `cap` CSS unit to resolve font metrics at render time. No JavaScript extraction step, no per-font variables. Changing `font-family` on an element automatically updates the `1cap` value the engine uses.

The baseline position formula is `(line-height + 1cap) / 2` — the browser resolves `1cap` from the font's OpenType tables natively.

| Browser | `mod()` | `cap` unit | `@property` | This engine's floor |
|---------|----------|------------|--------------|---------------------|
| Chrome  | 125+     | 118+       | 85+          | **125+**            |
| Safari  | 15.4+    | 17.2+      | 16.4+        | **17.2+**           |
| Firefox | 118+     | 97+        | 128+         | **128+**            |

A different feature binds each column: `mod()` in Chrome, the `cap` unit in Safari, `@property` in Firefox. The Firefox number is the soft one — see the note under "Browser Support".

The full table, and what the soft floors mean, is under "Browser Support" at the end.

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

Set the three metrics on `:root` as shown; the engine derives its own variables from them there, and every element inherits the result.

### baseline-trim.css — Text-box-trim hybrid

```css
@import url("@canonical/styles-typography/src/baseline-trim.css");
```

The most modern approach. Uses `text-box: trim-both cap alphabetic` to remove half-leading entirely, then compensates with `mod()`-based margin to restore grid alignment. Results in tighter content boxes (useful for buttons, cards, optical centering).

| Browser | `text-box-trim` | `mod()` | `cap` | `@property` | This engine's floor |
|---------|-----------------|----------|-------|--------------|---------------------|
| Chrome  | 133+            | 125+     | 118+  | 85+          | **133+**            |
| Safari  | 18.2+           | 15.4+    | 17.2+ | 16.4+        | **18.2+**           |
| Firefox | 154+            | 118+     | 97+   | 128+         | **154+**            |

`text-box-trim` binds every column.

The trim itself falls back gracefully: below those numbers it is skipped, the element keeps its default half-leading and the nudge still applies, so the grid still holds. On that reading the floor is **Chrome 125, Safari 17.2, Firefox 128** — the cap engine's, since the nudge uses the `cap` unit — and what a browser below 133 / 18.2 / 154 loses is the tighter content box, not the alignment.

## Consumer Contract

Every engine reads the same set of CSS custom properties per element:

| Variable | Scope | Description |
|----------|-------|-------------|
| `--baseline-height` | `:root` | Grid unit size (`0.25rem` in `@canonical/styles`; `4px` if nothing declares it) |
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

These are read, not declared, by the engine's element rules, so setting them on `:root` works: a custom property inherits from there into every element that reads it.

## Token Mapper

`mapper.css` and `mapper.elements.css` together bridge the semantic typography tokens from `@canonical/design-tokens` to the engine's variable contract. Both are imported by `index.css`, the package's default entry point.

The design tokens provide variables like:

```
--typography-heading-1-font-size
--typography-heading-1-line-height    (unitless ratio)
--typography-heading-1-font-weight
--typography-heading-1-letter-spacing
--typography-heading-1-font-family
```

`mapper.elements.css` converts these into the engine variables for each element (`h1`–`h6`, `p`, `.p`, `.code`). It sets `--line-height` as a length, not a multiplier: it prefers the exact dimension the design tokens carry, and falls back to the ratio snapped up onto the grid.

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

`--line-height-multiplier` is the other half of the contract, for a consumer that drives the engine directly rather than through the mapping: an engine reads `--line-height` if it is set and `calc(--baseline-height * --line-height-multiplier)` if it is not. The example uses the multiplier; `mapper.elements.css` uses the length.

## Package Structure

```
src/
  index.css              ← default entry point: re-exports baseline-cap.css
  mapper.css             ← entry point: the mapping that styles nothing
  mapper.elements.css    ← entry point: the rules that apply it to elements
  baseline-cap.css       ← cap-unit engine
  baseline-metrics.css   ← extracted-metrics engine
  baseline-trim.css      ← text-box-trim + cap hybrid
  baseline-shim.css      ← the --baseline-height @property registration
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

This serves the example at [http://localhost:3333/example/](http://localhost:3333/example/). The sidebar lets you:

- **Switch engines** — toggle between cap-unit, metrics, and text-trim in real time
- **Switch fonts** — pick from bundled fonts with auto-applied metrics
- **Tune per-tag** — adjust font-size, line-height multiplier, and space-after for each heading level and paragraph
- **Adjust baseline** — change the baseline grid height and see the alignment update

The baseline grid is rendered as a red 1px line overlay so alignment errors are immediately visible.

## Browser Support

| Feature | Used by | Chrome | Safari | Firefox |
|---------|---------|--------|--------|---------|
| `mod()` | all three engines | 125 | 15.4 | 118 |
| `round()` | the line-height fallback in `mapper.elements.css` | 125 | 15.4 | 118 |
| `@property` | the `--baseline-height` registration | 85 | 16.4 | 128 |
| `cap` unit | the cap and text-trim engines | 118 | 17.2 | 97 |
| `text-box-trim` | the text-trim engine only | 133 | 18.2 | 154 |

Read the table by engine, not row by row — an engine's floor is the highest number in its column among the features it uses:

| Engine | Chrome | Safari | Firefox | What binds |
|--------|--------|--------|---------|------------|
| `baseline-cap.css` | 125 | 17.2 | 128 | `mod()`, then the `cap` unit, then `@property` |
| `baseline-metrics.css` | 125 | 16.4 | 128 | `mod()`, then `@property` |
| `baseline-trim.css` | 133 | 18.2 | 154 | `text-box-trim` throughout |

Two of those are softer than they look.

`@property` is a **soft floor**. Below it the registration is ignored and the engine still runs wherever `--baseline-height` is declared — `@canonical/styles` declares it — so all that is lost is the 4px fallback for a page that declares the grid unit nowhere. It is what holds Firefox at 128 for the cap and metrics engines, and Safari at 16.4 for the metrics one.

`text-box-trim` is soft in a different way: below it the trim is skipped and the element keeps its default half-leading, but the nudge still applies and the grid still holds, so the text-trim engine degrades to the same alignment the others give from Chrome 125, Safari 16.4 and Firefox 128.

`mod()` is the hard one. Below it no engine computes a nudge and text falls back to its natural leading.

The design system targets current browsers and does not carry compatibility shims for older ones; an application that cannot move should pin a version.
