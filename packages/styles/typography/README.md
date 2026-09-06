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

`rem` is the usual choice, because the grid then follows the reader's own font size: a reader who sets a larger base size gets a proportionally larger grid, and the type stays on it. `px` fixes the grid in CSS pixels instead, so it stays the same whatever the reader's font size, which is what you want when the grid has to line up with something else measured the same way — a background image, or a rule drawn by another system.

A CSS pixel is a reference unit, not a device pixel: on a high-density display one CSS pixel covers several physical ones, and the browser's zoom changes how many. `px` buys you a grid that does not move with the font size; it does not buy alignment with the display's own pixels.

**Declare it nowhere and the grid is `0.25rem`, four pixels at the usual root font size.** Every read of the variable in this package carries that same fallback, so an engine linked on its own still snaps text to a grid rather than doing nothing. `@canonical/styles` declares `--baseline-height` itself, so an application using the full stylesheet never sees the fallback.

The fallback is written at each read rather than aliased into one internal custom property. That keeps each file complete on its own, which matters because any one of them can be linked without the rest, and it keeps a second name out of the surface for a consumer to set by mistake.

## How this package is cut

Five files, and the cut between them is the point of this section: it is a pattern, not a filing
decision, and the same pattern runs through `@canonical/styles` and the Vanilla adapter.

### A file is a concept, named for what it is

Not for what it includes, and never for what it leaves out.

| File | The concept |
| --- | --- |
| `tokens.css` | **the values.** The names that map the design tokens' typographic scale onto what the engines and the element rules read. It declares custom properties and styles nothing. |
| `elements.css` | **what bare elements get.** `body`, `h1`–`h6`, `p`, `.p`, `.code`, `.editorial`. |
| `baseline-cap.css`, `baseline-metrics.css`, `baseline-trim.css` | **the engines.** The arithmetic that puts a line on the grid. Interchangeable, one loaded at a time. |
| `index.css` | **the whole**, and nothing else. It composes the tokens, the element rules and the default engine, in that order. |

Each of the five is an entry point, and the name in the manifest is the name of the concept.

### Leaves import nothing; entries compose

The four leaves import nothing at all. Only `index.css` imports, and only the three it composes.

That is not tidiness. A browser treats every `@import` as its own stylesheet and de-duplicates
nothing, so a file reached by two paths is fetched, parsed and applied twice. The first cut of this
package had `elements.css` importing `tokens.css` while the engines imported the scale as well, and
the resolved stylesheet carried the typographic scale twice — 48,270 duplicated bytes, a quarter of
the entry. Leaves that import nothing make one path per file true by construction rather than by
vigilance.

What it asks of a consumer is small and worth stating: **link a file and you get what that file is,
and you declare what it reads.** An engine on its own reads `--baseline-height` and `--font-size`;
the element rules read the values `tokens.css` declares. The baseline unit may be written in `rem`
or `px`, and defaults to `0.25rem` when nothing declares it.

### The same word means the same thing in every package

`@canonical/styles` is cut the same way and uses the same three nouns. Its `tokens.css` is the values
and takes this package's `tokens.css`; its `elements.css` is what bare elements get and takes this
package's `elements.css` and the default engine; its `layout.css` is the layout presets. Its
`index.css` is the whole.

`@canonical/styles-vanilla-adapter` ships an `elements.css` too: the same three element layers, built
from the same source files, addressed to an island rather than to the page.

Three contexts, one vocabulary. A reader who has understood `elements.css` once has understood it
everywhere, and the only thing left to ask is which page region it is aimed at.

### Why the old names went

`mapper.css` was jargon — an internal word for the file that named the tokens, which told a reader
nothing about what was inside it and hid the fact that the file was doing two jobs.

The styles package's `core.css` was worse, because it named an inclusion rather than a concept:
"everything except the element layers". A name defined by subtraction tells you what a file is not.
You cannot tell whether a rule belongs in it without first knowing the whole list it is subtracting
from, and when the list changes the name silently stops being true. `tokens.css`, `elements.css` and
`layout.css` each name something a rule either is or is not.

### How to add a file

Decide which concept it belongs to. That one decision settles the rest:

- **its name** — the concept's noun;
- **its layer** — `ds.tokens` for values, `ds.typography` for element rules and engines;
- **which entries import it** — the entry for that concept, and no other.

If it belongs to no concept, that is the finding: either the concept is missing, or the file is two
files. `@canonical/styles`' `tests/entries.test.ts` pins the composition — which layers each entry
opens, that its tokens entry declares nothing but custom properties, that each file is reached once —
and this package's `exports` map is the contract for what a consumer may link.

## Cascade layers

Two facts about the CSS cascade shape this package.

A rule in no cascade layer outranks a rule in any layer, whatever the selectors on either side. And within one layer, two rules of equal specificity are settled by which one loaded second.

This package used to ship every one of its rules in no layer at all, so the first fact applied to all of them: nothing an application wrote in a layer could beat them. The second fact bit hardest on the element selectors, `body`, `h1`–`h6` and `p`, which sit at specificity `(0,0,1)`: an application's own `p` rule tied with this one exactly, and the bundler's output order decided the winner, one property at a time. The rest of the file is more specific than that — `.p`, `.code` and `.editorial` are classes, `:root` is a pseudo-class, and `.editorial h1` is a class and an element together — so those won on specificity rather than by luck, which is its own problem when an application meant to override them.

Layered, the design system loses to an application's unlayered CSS, deliberately and predictably, and beats the layers below it, also deliberately.

| What | Layer |
| --- | --- |
| `tokens.css` — the design-tokens naming shims (`:root`, custom properties only) | `ds.tokens` |
| `tokens.css` — the typographic scale it imports | `ds.modifiers`, which that file opens itself |
| `elements.css` — the `body`, `h1`–`h6`, `p`, `.p`, `.code` and `.editorial` rules | `ds.typography` |
| `baseline-cap.css`, `baseline-metrics.css`, `baseline-trim.css` — every rule | `ds.typography` |

`ds.typography` sits above `ds.reset` and below `ds.modifiers` in the order `@canonical/styles` declares, so the typographic scale in `ds.modifiers` can retune what the engine produces, and a component stylesheet — higher still — is always the final word on its own text.

The naming shims are in `ds.tokens` and not `ds.typography` because they are custom properties and nothing else: a custom property does nothing where it is declared, only where a rule reads it, so they belong beside the other primitive values.

These rules select elements by name — `body`, `h1`, `p` — so they apply to the whole document. That is what a design system's typography is for.

This package states no layer order of its own: it is imported by `@canonical/styles` after that package's order statement, which is the first rule of the first stylesheet and names all three layers this package writes to. Linked on its own, as the example does, the layers are created where they first appear, which is well defined for a single package and settles nothing this package needs settled — no custom property is declared in more than one of the layers involved.

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

| Browser | `text-box-trim` | `mod()` | `cap` unit | This engine's floor |
|---------|-----------------|----------|------------|---------------------|
| Chrome  | 133+            | 125+     | 118+       | **133+**            |
| Safari  | 18.2+           | 15.4+    | 17.2+      | **18.2+**           |
| Firefox | 154+            | 118+     | 97+        | **154+**            |

`text-box-trim` binds every column. The `cap` unit is in the list because the nudge measures the cap height itself, `mod(calc(-1 * 1cap), …)`, so this engine needs it as much as the cap engine does.

**It does not fall back to the grid.** Below the floor the trim is skipped and the element gets its half-leading back, but the nudge that survives was computed for a trimmed box and never reads the line height, so the text lands off the grid by a fraction of a unit — measured, 6.516px on a 16px serif at a 24px line, whatever the unit is. Use the cap engine for those browsers.

## Consumer Contract

Every engine reads the same set of CSS custom properties per element:

| Variable | Scope | Description |
|----------|-------|-------------|
| `--baseline-height` | `:root` | Grid unit size, in any length unit (e.g. `0.5rem` or `8px`) — optional, default `0.25rem` |
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

`elements.css` converts these into the engine variables for each element (`h1`–`h6`, `p`, `.p`, `.code`). It sets `--line-height` as a length, never a multiplier: it prefers the exact dimension the design tokens carry, and falls back to the tier's ratio snapped up onto the grid.

```css
--line-height: var(
  --typography-heading-1-line-height-dimension,
  round(
    up,
    calc(
      var(--typography-heading-1-font-size) *
      var(--typography-heading-1-line-height)
    ),
    var(--baseline-height, 0.25rem)
  )
);
```

`--line-height-multiplier` is the other half of the engines' contract, for a consumer who drives an engine directly rather than through this mapping: an engine reads `--line-height` if it is set, and `calc(--baseline-height * --line-height-multiplier)` if it is not. The example uses the multiplier; `elements.css` uses the length.

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

One caveat on that table, and it is a real one.

**Below `text-box-trim`, the text-trim engine does not hold the grid.** The trim is skipped, the element gets its half-leading back, and the nudge that survives — `mod(calc(-1 * 1cap), unit)` — was computed for a trimmed box and never reads the line height, so it cannot compensate. Measured in Chromium with a 16px serif on a 24px line: with the trim applied the first baseline sits at 12px on a 4px grid, 16px on an 8px grid and 12px on a 12px grid, every one a whole number of units; with the trim ignored it moves 6.516px in each case, which is 1.63, 0.81 and 0.54 units. The element's outer height stays a whole number of units, so blocks still stack on the grid, but the text inside them does not sit on it. A browser below the floor should use the cap engine, whose nudge is computed from the untrimmed line box.

`mod()` is the hard floor. Below it no engine computes a nudge at all and text falls back to its natural leading.
