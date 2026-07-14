# ContentLayout — Layout Specification

> **Status:** Draft — anatomy, grid, and token pairings complete; responsive behaviour deferred.
>
> Ported from [`@canonical/react-ds-app` ContentLayout](https://github.com/canonical/pragma/tree/main/packages/react/ds-app/src/lib/ContentLayout); structure and token pairings below mirror the core-approved React implementation.

---

## 1. Anatomy

The responsive content grid of a view. Children are direct grid items on one
of the design system's grid presets, selected by the `grid` prop:

```
grid="responsive" (default — fixed-responsive, breakpoint columns)
┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│  │  │  │  │  │  │  │  │  │  │  │  │  4 cols <768px · 8 to 1279px ·
└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘  12 from 1280px

grid="intrinsic" (fluid auto-fill)
┌─────────┬─────────┬─────────┬─────────┐
│ item    │ item    │ item    │ item    │  repeat(auto-fill,
├─────────┼─────────┼─────────┼─────────┤  minmax(--grid-col-min, 1fr) × 4)
│ item    │ item    │         │         │
└─────────┴─────────┴─────────┴─────────┘
```

| Anatomy file | URI |
|---|---|
| [ContentLayout.anatomy.yaml](./ContentLayout.anatomy.yaml) | `apps.layout.content_layout` |

### Layout constraints

| Property | Value | Notes |
|---|---|---|
| `layout.type` | `grid` | Composes the `.grid` presets from `@canonical/styles` (`.responsive` / `.intrinsic`) |
| grid mode | `responsive` (default) \| `intrinsic` | `grid` prop; fixed-responsive breakpoint columns vs fluid auto-fill |
| `spacing.gap` | `grid/gutter` | `--grid-gap` (or per-axis `--grid-row-gap`/`--grid-column-gap`) overrides |
| content items | `0..*` · slot `default` | Direct grid items; span via `grid-column`/`grid-row` |
| `align-content` | `start` | Rows size to content; scrolling belongs to the containing region |

### Knobs

| Custom property | Effect | Default |
|---|---|---|
| `--grid-col-min` | Minimum column width | `100px` (from `@canonical/styles`) |
| `--grid-gap` | Both gap axes | `--grid-gutter` (1.5rem) |

---

## 2. Token Pairings

### ADR-L03 — Grid gaps · *Approved*

| Token | Applied to | Notes |
|---|---|---|
| `grid.gutter` (`--grid-gutter`) | Column and row gaps | Same chain as the `.grid` preset in `@canonical/styles` |

No colour pairings: layouts divide space and paint nothing.

---

## 3. Properties

| Prop | Type | Notes |
|---|---|---|
| `children` | `Snippet` | Default slot — direct grid items |
| `grid` | `"responsive" \| "intrinsic"` | Grid preset; defaults to `responsive` (fixed-responsive) |
| …rest | `SvelteHTMLElements["div"]` | Spread onto the root |

---

## 4. Accessibility

No landmarks imposed; the grid is purely presentational. Item order is
document order — auto-fill reflows do not reorder the accessibility tree.

---

## 5. Ontology

Implements `apps.layout.content_layout` (design-system
`data/apps/layout/content_layout.ttl`), `ds:domain "the content of the
view"`. The instance's original `ds:grid` (`repeat(auto-fit, …)`, literal
`100px` minimum) is amended per L.01 GE.09(4) to the validated intrinsic
template (`auto-fill`, tokenised `--grid-col-min`). **Recorded gap:**
`ds:grid` holds a single CSS template and cannot express either the grid-mode
switch or the responsive preset's breakpointed templates — the intrinsic
template is recorded and both modes are described in `ds:summary`.
