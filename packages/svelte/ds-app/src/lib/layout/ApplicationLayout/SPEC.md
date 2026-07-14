# ApplicationLayout — Layout Specification

> **Status:** Draft — anatomy, grid, and token pairings complete; responsive behaviour deferred.
>
> Ported from [`@canonical/react-ds-app` ApplicationLayout](https://github.com/canonical/pragma/tree/main/packages/react/ds-app/src/lib/ApplicationLayout); structure and token pairings below mirror the core-approved React implementation.

---

## 1. Anatomy

The application shell. A full-height grid dividing the viewport between a
navigation rail and the main content area.

```
┌────────────┬──────────────────────────────────┐
│ navigation │ default                          │
│ (slot,     │ (slot, 1fr)                      │
│ min-       │                                  │
│ content)   │ typically a ViewLayout           │
│            │                                  │
└────────────┴──────────────────────────────────┘
grid-template-columns: min-content 1fr
```

| Anatomy file | URI |
|---|---|
| [ApplicationLayout.anatomy.yaml](./ApplicationLayout.anatomy.yaml) | `apps.layout.application_layout` |

### Layout constraints

| Property | Value | Notes |
|---|---|---|
| `layout.type` | `grid` | `min-content 1fr` per the ontology instance (`ds:grid`) |
| `size.height` | `fill` | Occupies 100% of parent block size |
| `spacing.gap` | `container/gap/default` | The 1rem gutter from the #421 design reference, tokenised; `--application-layout-gap` overrides (0 for a flush shell) |
| navigation region | `0..1` · slot `navigation` | When absent, the rail column is dropped (`:has()`), content takes full width |
| content region | `1` · slot `default` | `min-size: 0` so it scrolls internally |

### Slot discipline

The navigation slot is **slot-agnostic**: it accepts any Snippet (typically
rendering a SideNavigation) and the layout neither imports nor assumes one.
The slot content owns its inline size and its landmark semantics (e.g.
`<nav>`).

---

## 2. Token Pairings

### ADR-L01 — Region gap · *Approved*

| Token | Applied to | Notes |
|---|---|---|
| `container.gap.default` (`--container-gap-default`) | Gutter between rail and content | Tokenises the design reference's ad-hoc `--gap: 1rem` (#421); override knob `--application-layout-gap` (set `0` for a flush shell) |

No colour pairings: layouts divide space and paint nothing. Backgrounds come
from slot content and the surface cascade.

---

## 3. Properties

| Prop | Type | Notes |
|---|---|---|
| `navigation` | `Snippet` | Named slot, leading `min-content` column |
| `children` | `Snippet` | Default slot, `1fr` column |
| …rest | `SvelteHTMLElements["div"]` | Spread onto the root |

---

## 4. Accessibility

The layout imposes no landmarks — slot content supplies them (SideNavigation
brings `nav`; a page's content brings `main`). Regions use `min-size: 0` so
internal scroll containers work with keyboard scrolling.

---

## 5. Ontology

Implements `apps.layout.application_layout` (design-system
`data/apps/layout/application_layout.ttl`): `ds:grid "min-content 1fr"`,
`ds:domain "application"`. The anatomy YAML here is the source for the
instance's `ds:anatomyDsl` (L.01 GE.09).
