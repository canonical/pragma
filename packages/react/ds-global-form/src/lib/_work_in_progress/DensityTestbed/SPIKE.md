# Baseline-alignment spike — findings

Exploratory spike, not a production refactor. It covers two linked changes:

1. Moving the baseline unit from **8px to 4px**.
2. An alternative baseline-alignment model for **boxed controls** (buttons,
   inputs, nav items, list/table rows) that stops forcing the bottom border onto
   the grid.

Everything is scoped to `_work_in_progress`; the only shared-package edits are
the 4px default (in `styles`, not tokens) and the grid overlay (in
`styles-debug`), both called out below.

---

## 1. What the shipped engine does today

The typography engine (`@canonical/styles-typography`, default
`baseline-cap.css`) snaps each text element's box to the grid with two padding
nudges computed live in CSS:

```
--start-nudge = baseline − mod(baseline-position, baseline)   /* seat the text baseline */
--end-nudge   = baseline − start-nudge                        /* fill to a whole grid multiple */

padding-block-start: var(--start-nudge);
padding-block-end:   var(--end-nudge);
```

Because `start-nudge + end-nudge = baseline`, the box height is always a whole
number of baseline units **and both the top and bottom borders sit on the grid**.

The cost: whenever `start-nudge ≠ end-nudge`, the interior is asymmetric — the
text is nudged down from the top by one amount and up from the bottom by a
different amount. On a control with a visible border and a fixed look (a 24px or
32px button), that reads as the label sitting slightly high or low in its box.

## 2. The proposed model

Keep the top alignment; make the interior symmetric; move the leftover outside
the box:

```
padding-block-start: var(--start-nudge);   /* unchanged — seat the baseline */
padding-block-end:   var(--start-nudge);   /* MIRROR the top nudge, not end-nudge */

/* the box is now NOT a whole grid multiple, so compensate outside it */
--visible: calc(2*border + 2*start-nudge + line-height);
margin-block-end: calc(round(up, var(--visible), var(--baseline-height)) − var(--visible));
```

- Top border stays on the grid.
- Interior spacing above and below the text is equal → visually balanced.
- Bottom border floats where it naturally lands.
- External `margin-block-end` (0…<1 baseline) pads the *occupied* height back to
  a 4px multiple, so downstream layout rhythm is preserved.

Worked example (the brief's numbers): borders + top nudge + line-height + bottom
nudge come to a 21px visible box → `margin-block-end: 3px` → 24px occupied.

The alternative (top-align + external-margin) model was prototyped and then
dropped: the testbed now renders the **shipped engine model only** (the asymmetric
start/end nudges), with no `.model-current` / `.model-proposed` toggle. This
section is kept as the record of what was considered and why the external-margin
approach was not adopted (see §4).

---

## 3. Architectural & token changes required

**Baseline unit (4px).** Set in `packages/styles/main/src/spacing.css`:
`--space-baseline: 0.25rem`, no longer reading `--dimension-size-height-baseline`
(which stays 8px). Promoting 4px into `@canonical/design-tokens` is a **separate
tokens PR** — not done here on purpose. The engine reads `--baseline-height`
live, so nothing else changed to move the grid.

**Grid overlay (debug).** `packages/styles/debug/src/baseline-grid.css` now
defaults to 4px and paints **alternating bands** (tinted 4px / clear 4px) plus a
major line every 4th baseline, so the denser grid stays readable. Applied only
via the plugin — the story opts in with `parameters: { baseline: true }` and
`storybook-addon-utils` toggles `.with-baseline-grid`. (The addon was extended to
honor that parameter, not just the toolbar global; its `dist` must be rebuilt for
the change to take effect.)

**The alignment model itself** would live in the engine
(`baseline-cap.css` / `-metrics` / `-trim`), because that is where `start-nudge`
/ `end-nudge` are defined. Concretely:

- Add an opt-in mode (class or custom property, e.g. `.baseline-boxed` /
  `--baseline-mode: boxed`) that swaps `padding-block-end` from `--end-nudge` to
  `--start-nudge` and emits the compensating `margin-block-end`.
- The engine currently reserves `margin-block-end` for `--space-after`
  (editorial). The boxed mode has to **add to** that margin, not overwrite it:
  `margin-block-end: calc(space-after-margin + compensation)`. This is the one
  real coupling to untangle.
- `round()` is already relied on elsewhere in the engine, so no new browser
  floor.

**Per-component.** Boxed controls (`Button`, form inputs, future Tabs/SideNav
items, list/table rows) opt into the boxed mode on their outer element. Their
own `padding-block` (where they set it) must be reconciled with the nudges so the
two don't stack.

---

## 4. Risks introduced by external margin compensation

- **Margin collapsing.** `margin-block-end` collapses with adjacent block
  margins and through empty parents. In flex/grid containers margins don't
  collapse (safe — that is where most controls live), but in plain block flow a
  control's compensation can merge with a following sibling's top margin and the
  rhythm silently shifts. The engine deliberately used *padding* to avoid exactly
  this; the proposed model reintroduces the hazard by design.
- **Last-child / container edges.** Trailing compensation adds phantom space at
  the bottom of a container (extra gap under the last row of a table, below the
  last field in a form). Needs a `:last-child` reset in boxed contexts —
  analogous to the existing `.content-flow > :last-child { margin-bottom: 0 }`.
- **`gap` double-counts.** In a flex/grid layout that already sets `gap`, each
  item's external margin **adds to** the gap, so spacing between controls grows
  by the compensation amount. Either the layout drops `gap` in favour of the
  margins, or boxed controls suppress their margin when a gap owns the spacing.
  (The testbed sets `gap: 0` on the control column precisely so the compensation
  stays visible instead of being masked.)
- **Backgrounds / borders / dividers.** The compensation is outside the box, so
  a full-bleed row background or a shared list divider stops at the border, not
  at the occupied edge — a 3px unpainted strip appears between rows. The
  shared-border list case in the testbed is there to show this.
- **Vertical centering.** Anything relying on the control's *box* being a grid
  multiple to center it (icon next to label, absolutely-positioned affordances)
  now centers against a non-grid box; the external margin doesn't participate.
- **Sticky / scroll math.** Occupied height ≠ border-box height means
  `scroll-margin`, sticky offsets and `IntersectionObserver` thresholds computed
  from `getBoundingClientRect()` are off by the compensation.

## 5. Where this model should NOT be used

- **Inline text / prose.** Paragraphs and inline runs already balance naturally;
  the whole point of the symmetric-interior model is boxed controls with a
  visible border. Prose keeps the current engine (`.p`, headings unchanged).
- **Controls whose height is externally fixed** (`height: 32px`, icon-only
  square buttons). If the height is pinned, interior symmetry is governed by
  `align-items`, not the nudges, and the external margin just adds stray space.
- **Grid/flex items that must fill a track** (`align-items: stretch`, table cells
  with row-spanning). Stretch overrides the box height and the compensation
  margin is ignored or fights the track.
- **Anything inside `gap`-based layouts** unless the gap-vs-margin
  double-count is resolved for that container.
- **Overlapping / absolutely positioned** elements — margin does nothing there.

## 6. Recommended implementation strategy

Ship it as an **opt-in engine mode**, defaulted off, so nothing changes until a
component asks for it.

1. **Engine flag.** Add `--baseline-mode: grid | boxed` (default `grid`). In
   `boxed`, `padding-block-end` mirrors `--start-nudge` and the engine emits
   `margin-block-end: calc(var(--space-after-margin) + var(--baseline-compensation))`.
   Keep `grid` byte-for-byte as today.
2. **Container reset.** Provide a `.baseline-boxed-flow` (or reuse
   `content-flow`) that zeroes the trailing compensation on the last child and
   documents the gap-vs-margin rule.
3. **Adopt on one control first** (Button), verify against prose in the testbed
   at several sizes, then inputs, then nav items, then list/table rows (the
   shared-border case last, since it exposes the divider gap).
4. **Only then** consider promoting 4px + a `density: boxed` token set into
   `@canonical/design-tokens`.

### Before / after

```css
/* BEFORE — grid mode (ships today): both borders on grid, interior can be asymmetric */
.ds.button > .p {
  padding-block-start: var(--start-nudge);   /* e.g. 3px */
  padding-block-end:   var(--end-nudge);     /* e.g. 1px  → text sits high */
}

/* AFTER — boxed mode: symmetric interior, bottom border free, rhythm via margin */
.ds.button {
  --visible: calc(2px + calc(2 * var(--start-nudge)) + var(--computed-line-height));
  margin-block-end: calc(
    var(--space-after-margin, 0px) +
    (round(up, var(--visible), var(--baseline-height)) - var(--visible))
  );
}
.ds.button > .p {
  padding-block-start: var(--start-nudge);   /* 3px */
  padding-block-end:   var(--start-nudge);   /* 3px  → text balanced */
}
```

### Caveat surfaced by the testbed

At the default body size on a 4px grid, `start-nudge ≈ end-nudge`, so the two
models render nearly identically — the asymmetry the model fixes only becomes
visible at particular font-size / line-height / border combinations. Any adoption
decision should be made against a size where the current asymmetry is actually
visible, not the default paragraph tier. The testbed should grow a row at such a
size before this is taken forward.
