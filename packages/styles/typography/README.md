# @canonical/styles-typography

Baseline grid alignment for the Canonical Design System. This package provides three interchangeable CSS engines that snap text baselines to a configurable grid, plus a semantic token mapper that bridges `@canonical/design-tokens` typography tokens to the engine's variable contract.

## Quick Start

Import the default engine (cap-unit) and set your baseline height:

```css
@import url("@canonical/styles-typography");

:root {
  --baseline-height: 0.5rem;
}
```

That's it. All `h1`–`h6` and `p` elements will align to the baseline grid. The default engine uses the CSS `cap` unit and requires no JavaScript font extraction.

## Cascade layers

Two facts about the CSS cascade shape this package.

A rule in no cascade layer outranks a rule in any layer, whatever the selectors on either side. And within one layer, two rules of equal specificity are settled by which one loaded second.

This package used to ship every one of its rules in no layer at all, so the first fact applied to all of them: nothing an application wrote in a layer could beat them. The second fact bit hardest on the element selectors, `body`, `h1`–`h6` and `p`, which sit at specificity `(0,0,1)`: an application's own `p` rule tied with this one exactly, and the bundler's output order decided the winner, one property at a time. The rest of the file is more specific than that — `.p`, `.code` and `.editorial` are classes, `:root` is a pseudo-class, and `.editorial h1` is a class and an element together — so those won on specificity rather than by luck, which is its own problem when an application meant to override them.

Layered, the design system loses to an application's unlayered CSS, deliberately and predictably, and beats the layers below it, also deliberately.

| What | Layer |
| --- | --- |
| `mapper.css` — the design-tokens naming shims (`:root`, custom properties only) | `ds.tokens` |
| `mapper.css` — the `body`, `h1`–`h6`, `p`, `.p`, `.code` and `.editorial` rules | `ds.typography` |
| `baseline-cap.css`, `baseline-metrics.css`, `baseline-trim.css` — every rule | `ds.typography` |
| `baseline-shim.css` — the `@property` registration | none, by design |
| `@canonical/design-tokens/dist/modifiers.typography.css`, imported by each engine | `ds.modifiers`, which that file opens itself |

`ds.typography` sits above `ds.reset` and below `ds.modifiers` in the order `@canonical/styles` declares, so the typographic scale in `ds.modifiers` can retune what the engine produces, and a component stylesheet — higher still — is always the final word on its own text.

The naming shims are in `ds.tokens` and not `ds.typography` because they are custom properties and nothing else: a custom property does nothing where it is declared, only where a rule reads it, so they belong beside the other primitive values. The `@property` registration is in no layer because a registration is not cascaded at all — the last one in document order wins whatever layer it sits in, so a layer would have nothing to order it against.

These rules select elements by name — `body`, `h1`, `p` — so they apply to the whole document. That is what a design system's typography is for.

This package states no layer order of its own: it is imported by `@canonical/styles` after that package's order statement, which is the first rule of the first stylesheet and names both layers. Linked on its own, as the example does, the layers are created where they first appear, which is well defined for a single package and settles nothing this package needs settled — no custom property is declared in more than one of the layers involved.

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

Three engines implement the same grid-snap pattern with different trade-offs. Import the one that fits your constraints directly, or use `index.css` which re-exports the default (cap-unit).

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
| Firefox | 118+     | 97+        | 128+         | **118+**            |

`mod()` binds Chrome and Firefox, the `cap` unit binds Safari. The `@property` column is listed for completeness and does not enter the floor: the registration it refers to is invalid and discarded in every browser, so raising a browser to 128 buys nothing. See the note under "Browser Support".

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

### baseline-trim.css — Text-box-trim hybrid

```css
@import url("@canonical/styles-typography/src/baseline-trim.css");
```

The most modern approach. Uses `text-box: trim-both cap alphabetic` to remove half-leading entirely, then compensates with `mod()`-based margin to restore grid alignment. Results in tighter content boxes (useful for buttons, cards, optical centering).

| Browser | `text-box-trim` | `mod()` | `@property` | This engine's floor |
|---------|-----------------|----------|--------------|---------------------|
| Chrome  | 133+            | 125+     | 85+          | **133+**            |
| Safari  | 18.2+           | 15.4+    | 16.4+        | **18.2+**           |
| Firefox | 154+            | 118+     | 128+         | **154+**            |

`text-box-trim` binds every column. The `@property` column is listed for completeness and does not enter the floor; see the note under "Browser Support".

**It does not fall back to the grid.** Below the floor the trim is skipped and the element gets its half-leading back, but the nudge that survives was computed for a trimmed box and never reads the line height, so the text lands off the grid by a fraction of a unit — measured, 6.516px on a 16px serif at a 24px line, whatever the unit is. Use the cap engine for those browsers.

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

This serves the example at [http://localhost:3333/example/](http://localhost:3333/example/). The sidebar lets you:

- **Switch engines** — toggle between cap-unit, metrics, and text-trim in real time
- **Switch fonts** — pick from bundled fonts with auto-applied metrics
- **Tune per-tag** — adjust font-size, line-height multiplier, and space-after for each heading level and paragraph
- **Adjust baseline** — change the baseline grid height and see the alignment update

The baseline grid is rendered as a red 1px line overlay so alignment errors are immediately visible.

## Browser Support

All engines require `mod()` for the grid-snap calculation:

| Feature | Used by | Chrome | Safari | Firefox |
|---------|---------|--------|--------|---------|
| `mod()` | all three engines | 125 | 15.4 | 118 |
| `round()` | the mapper's line-height fallback | 125 | 15.4 | 118 |
| `@property` | the `--baseline-height` registration | 85 | 16.4 | 128 |
| `cap` unit | the cap and text-trim engines | 118 | 17.2 | 97 |
| `text-box-trim` | the text-trim engine only | 133 | 18.2 | 154 |

Read the table by engine, not row by row — an engine's floor is the highest number in its column among the features it uses:

| Engine | Chrome | Safari | Firefox | What binds |
|--------|--------|--------|---------|------------|
| `baseline-cap.css` | 125 | 17.2 | 118 | `mod()`, and the `cap` unit in Safari |
| `baseline-metrics.css` | 125 | 15.4 | 118 | `mod()` throughout |
| `baseline-trim.css` | 133 | 18.2 | 154 | `text-box-trim` throughout |

Two things that table does not say, and both matter.

**`@property` is not in it, on purpose.** The registration in `baseline-shim.css` writes its initial value in `rem`, which is not computationally independent, so Chromium and Firefox alike throw the whole rule away: it is invalid everywhere and cannot raise a minimum version, because there is no version at which it starts working. The engines therefore run wherever `mod()` does, given a consumer-declared `--baseline-height` — which the consumer contract asks for. Without that declaration no browser gives the engine a grid, old or new, because the fallback the registration promises does not exist. The next change in this series deletes the registration and gives every read of the unit a `0.25rem` fallback, which is what makes the contract's "optional" true.

**Below `text-box-trim`, the text-trim engine does not hold the grid.** The trim is skipped, the element gets its half-leading back, and the nudge that survives — `mod(calc(-1 * 1cap), unit)` — was computed for a trimmed box and never reads the line height, so it cannot compensate. Measured in Chromium with a 16px serif on a 24px line: with the trim applied the first baseline sits at 12px on a 4px grid, 16px on an 8px grid and 12px on a 12px grid, every one a whole number of units; with the trim ignored it moves 6.516px in each case, which is 1.63, 0.81 and 0.54 units. The element's outer height stays a whole number of units, so blocks still stack on the grid, but the text inside them does not sit on it. A browser below the floor should use the cap engine, whose nudge is computed from the untrimmed line box.

`mod()` is the hard floor. Below it no engine computes a nudge at all and text falls back to its natural leading.
