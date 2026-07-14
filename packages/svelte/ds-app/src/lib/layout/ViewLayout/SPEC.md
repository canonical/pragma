# ViewLayout — Layout Specification

> **Status:** Draft — anatomy, grid, and token pairings complete; responsive behaviour deferred.
>
> Ported from [`@canonical/react-ds-app` ViewLayout](https://github.com/canonical/pragma/tree/main/packages/react/ds-app/src/lib/ViewLayout); structure and token pairings below mirror the core-approved React implementation.

---

## 1. Anatomy

A single view within the application shell. Divides its space between the
view content and an optional contextual aside (detail panel, filters, help).

```
┌──────────────────────────────────┬────────────┐
│ default                          │ aside      │
│ (slot, 1fr)                      │ (slot,     │
│                                  │ min-       │
│ typically a ContentLayout        │ content)   │
│                                  │            │
└──────────────────────────────────┴────────────┘
grid-template-columns: 1fr min-content
```

| Anatomy file | URI |
|---|---|
| [ViewLayout.anatomy.yaml](./ViewLayout.anatomy.yaml) | `apps.layout.view_layout` |

### Layout constraints

| Property | Value | Notes |
|---|---|---|
| `layout.type` | `grid` | `1fr min-content` per the ontology instance (`ds:grid`) |
| `size.height` | `fill` | Occupies 100% of parent block size |
| `spacing.gap` | `container/gap/default` | `--view-layout-gap` overrides |
| content region | `1` · slot `default` | `min-size: 0` so it scrolls internally |
| aside region | `0..1` · slot `aside` | When absent, the trailing column is dropped (`:has()`) |

### Slot discipline

The aside slot is slot-agnostic: it accepts any Snippet, and that slot
content owns its inline size and its landmark semantics (e.g. an `<aside>`
element). The layout only reserves the trailing `min-content` column.

---

## 2. Token Pairings

### ADR-L02 — Content/aside gap · *Approved*

| Token | Applied to | Notes |
|---|---|---|
| `container.gap.default` (`--container-gap-default`) | Gap between content and aside | Override knob `--view-layout-gap` |

No colour pairings: layouts divide space and paint nothing.

---

## 3. Properties

| Prop | Type | Notes |
|---|---|---|
| `children` | `Snippet` | Default slot, `1fr` column |
| `aside` | `Snippet` | Named slot, trailing `min-content` column |
| …rest | `SvelteHTMLElements["div"]` | Spread onto the root |

---

## 4. Accessibility

No landmarks imposed; slot content supplies them. Regions use `min-size: 0`
for internal scrolling.

---

## 5. Ontology

Implements `apps.layout.view_layout` (design-system
`data/apps/layout/view_layout.ttl`): `ds:grid "1fr min-content"`,
`ds:domain "view"`. The anatomy YAML here is the source for the instance's
`ds:anatomyDsl` (L.01 GE.09).
