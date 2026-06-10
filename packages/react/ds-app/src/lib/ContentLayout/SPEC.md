# ContentLayout — Layout Specification

> **Status:** Draft — anatomy, grid, and token pairings complete; responsive behaviour deferred.

---

## 1. Anatomy

The responsive content grid of a view. Children are direct grid items on the
design system's intrinsic grid (fluid auto-fill, groups of four columns).

```
┌─────────┬─────────┬─────────┬─────────┐
│ item    │ item    │ item    │ item    │
├─────────┼─────────┼─────────┼─────────┤
│ item    │ item    │         │         │
└─────────┴─────────┴─────────┴─────────┘
grid-template-columns: var(--grid-intrinsic)
(repeat(auto-fill, minmax(var(--grid-col-min), 1fr) × 4))
```

| Anatomy file | URI |
|---|---|
| [ContentLayout.anatomy.yaml](./ContentLayout.anatomy.yaml) | `apps.layout.content_layout` |

### Layout constraints

| Property | Value | Notes |
|---|---|---|
| `layout.type` | `grid` | The `--grid-intrinsic` preset from `@canonical/styles` |
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
| `children` | `ReactNode` | Default slot — direct grid items |
| …rest | `HTMLAttributes<HTMLDivElement>` | Spread onto the root |

---

## 4. Accessibility

No landmarks imposed; the grid is purely presentational. Item order is
document order — auto-fill reflows do not reorder the accessibility tree.

---

## 5. Ontology

Implements `apps.layout.content_layout` (design-system
`data/apps/layout/content_layout.ttl`), `ds:domain "the content of the
view"`. **Known divergence:** the instance's `ds:grid` records
`repeat(auto-fit, …)` with a literal `100px` minimum; the implementation uses
the `--grid-intrinsic` preset (`auto-fill`, tokenised `--grid-col-min`). Per
L.01 GE.09(4), the instance is amended to match the validated implementation
in the paired design-system commit.
