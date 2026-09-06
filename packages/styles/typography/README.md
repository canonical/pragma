# @canonical/styles-typography

Baseline grid alignment for the Canonical Design System. This package provides three interchangeable CSS engines that snap text baselines to a configurable grid, plus the typography tokens and the element rules that bridge `@canonical/design-tokens` to the engine's variable contract.

## Quick Start

Import the default engine (cap-unit):

```css
@import url("@canonical/styles-typography");
```

That's it. All `h1`–`h6` and `p` elements will align to the baseline grid. The default engine uses the CSS `cap` unit and requires no JavaScript font extraction.

### The grid unit

`--baseline-height` is the size of one grid step, and it is optional. Declare it in whatever length unit suits the page:

```css
:root {
  --baseline-height: 0.5rem;  /* or 8px, or 0.25rem, or 6pt */
}
```

`rem` is the usual choice, because the grid then follows the reader's own font size: a reader who sets a larger base size gets a proportionally larger grid, and the type stays on it. `px` pins the grid to device pixels instead, which is what you want if the grid has to line up with something measured in pixels — a background image, or a rule drawn by another system.

**Declare it nowhere and the grid is `0.25rem`, four pixels at the usual root font size.** Every read of the variable in this package carries that same fallback, so an engine linked on its own still snaps text to a grid rather than doing nothing. `@canonical/styles` declares `--baseline-height` itself, so an application using the full stylesheet never sees the fallback.

The fallback is written at each read rather than aliased into one internal custom property. That keeps each file complete on its own, which matters because any one of them can be linked without the rest, and it keeps a second name out of the surface for a consumer to set by mistake.

## Cascade layers

Two facts about the CSS cascade shape this package.

A rule in no cascade layer outranks a rule in any layer, whatever the selectors on either side. And within one layer, two rules of equal specificity are settled by which one loaded second. This package used to ship its rules in no layer at all, at specificity `(0,0,1)` — `p`, `h1`, `body` — so an application's own `p` rule tied with this one and the bundler's output order decided the winner, one property at a time. Layered, the design system loses to an application's unlayered CSS, deliberately and predictably, and beats the layers below it, also deliberately.

| What | Layer |
| --- | --- |
| `tokens.css` — the design-tokens naming shims (`:root`, custom properties only) | `ds.tokens` |
| `tokens.css` — the typographic scale it imports | `ds.modifiers`, which that file opens itself |
| `elements.css` — the `body`, `h1`–`h6`, `p`, `.p`, `.code` and `.editorial` rules | `ds.typography` |
| `baseline-cap.css`, `baseline-metrics.css`, `baseline-trim.css` — every rule | `ds.typography` |

`ds.typography` sits above `ds.reset` and below `ds.modifiers` in the order `@canonical/styles` declares, so the typographic scale in `ds.modifiers` can retune what the engine produces, and a component stylesheet — higher still — is always the final word on its own text.

The naming shims are in `ds.tokens` and not `ds.typography` because they are custom properties and nothing else: a custom property does nothing where it is declared, only where a rule reads it, so they belong beside the other primitive values.

## Entry points

Five files, none of which imports another.

| Entry | What it is |
| --- | --- |
| `@canonical/styles-typography` | the package composed: the tokens, the element rules and the default engine, in that order. What an ordinary page wants. |
| `@canonical/styles-typography/tokens.css` | the typographic scale and the naming shims. Declares custom properties and styles nothing. |
| `@canonical/styles-typography/elements.css` | the rules that read those values and put them on `body`, `h1`–`h6`, `p`, `.p`, `.code` and `.editorial`. |
| `@canonical/styles-typography/baseline-cap.css` and its two siblings | the engines, which compute the nudges that put a line on the grid. |

The leaves import nothing, and the composed entry imports the three it needs. That way a stylesheet that wants a different arrangement — the values without the element rules, or an engine on its own — takes the files it wants and gets each of them exactly once, rather than fighting a file that drags in its own dependencies. A browser treats every `@import` as its own stylesheet and de-duplicates nothing, so a file reached from two directions is fetched, parsed and applied twice.

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

| Browser | `mod()` | `cap` unit | This engine's floor |
|---------|----------|------------|---------------------|
| Chrome  | 125+     | 118+       | **125+**            |
| Safari  | 15.4+    | 17.2+      | **17.2+**           |
| Firefox | 118+     | 97+        | **118+**            |

`mod()` binds Chrome and Firefox, the `cap` unit binds Safari.

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

| Browser | `text-box-trim` | `mod()` | This engine's floor |
|---------|-----------------|----------|---------------------|
| Chrome  | 133+            | 125+     | **133+**            |
| Safari  | 18.2+           | 15.4+    | **18.2+**           |
| Firefox | 154+            | 118+     | **154+**            |

`text-box-trim` binds every column.

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

## Tokens and elements

`tokens.css` and `elements.css` together bridge the semantic typography tokens from `@canonical/design-tokens` to the engine's variable contract. Both are imported by `index.css`, the package's composed entry point.

The design tokens provide variables like:

```
--typography-heading-1-font-size
--typography-heading-1-line-height    (unitless ratio)
--typography-heading-1-font-weight
--typography-heading-1-letter-spacing
--typography-heading-1-font-family
```

`elements.css` converts these into the engine variables for each element (`h1`–`h6`, `p`), including computing `--line-height-multiplier` by snapping the typographic line-height to the nearest baseline-grid unit:

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
  index.css              ← the package composed (tokens, elements, cap engine)
  tokens.css             ← the typographic scale and the naming shims
  elements.css           ← the rules that read them
  baseline-cap.css       ← cap-unit engine
  baseline-metrics.css   ← extracted-metrics engine
  baseline-trim.css      ← text-box-trim + cap hybrid
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
| `round()` | the line-height fallback in `elements.css` | 125 | 15.4 | 118 |
| `cap` unit | the cap and text-trim engines | 118 | 17.2 | 97 |
| `text-box-trim` | the text-trim engine only | 133 | 18.2 | 154 |

Read the table by engine, not row by row — an engine's floor is the highest number in its column among the features it uses:

| Engine | Chrome | Safari | Firefox | What binds |
|--------|--------|--------|---------|------------|
| `baseline-cap.css` | 125 | 17.2 | 118 | `mod()`, and the `cap` unit in Safari |
| `baseline-metrics.css` | 125 | 15.4 | 118 | `mod()` throughout |
| `baseline-trim.css` | 133 | 18.2 | 154 | `text-box-trim` throughout |

One caveat on that table. `text-box-trim` is soft: below it the trim is skipped and the element keeps its default half-leading, but the nudge still applies and the grid still holds, so the text-trim engine degrades to the alignment the other two give rather than failing.

`mod()` is the hard one. Below it no engine computes a nudge and text falls back to its natural leading.
