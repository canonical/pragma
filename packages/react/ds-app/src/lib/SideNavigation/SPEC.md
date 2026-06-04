# SideNavigation — Component Specification

> **Status:** Draft — anatomy and token pairings complete; state, accessibility, and props deferred.

---

## Table of Contents

1. [Anatomy](#1-anatomy)
2. [Token Pairings](#2-token-pairings)
3. [Properties](#3-properties) *(deferred)*
4. [State Management & Keyboard Navigation](#4-state-management--keyboard-navigation) *(deferred)*
5. [Accessibility](#5-accessibility) *(deferred)*

---

## 1. Anatomy

The `SideNavigation` is a full-height container that partitions its vertical space among three subcomponents. Header and Footer are optional; Content is required and grows to fill the remaining space.

```
┌─────────────────────────────────────────┐ ─┐
│  SideNavigation.Header                  │  │ required
│  ┌─────────────┐         ┌────────────┐ │  │
│  │    brand    │         │  collapse  │ │  │
│  │  (logo/icon)│         │   toggle   │ │  │
│  └─────────────┘         └────────────┘ │  │
│  flex-start                  flex-end   │  │
├─────────────────────────────────────────┤ ─┤
│  SideNavigation.Content                 │  │ required · flex: 1 · overflow: auto
│  ┌─────────────────────────────────────┐│  │
│  │ nav item list                       ││  │
│  │  ├─ side-navigation-item            ││  │
│  │  ├─ side-navigation-item            ││  │
│  │  └─ ...                             ││  │
│  └─────────────────────────────────────┘│  │
├─────────────────────────────────────────┤ ─┤
│  SideNavigation.Footer                  │  │ optional
│  ┌─────────────────────────────────────┐│  │
│  │ nav item list                       ││  │
│  │  ├─ side-navigation-item            ││  │
│  │  └─ ...                             ││  │
│  └─────────────────────────────────────┘│  │
└─────────────────────────────────────────┘ ─┘
```

### Anatomy files

| Component                    | URI                                              | File |
|------------------------------|--------------------------------------------------|------|
| `SideNavigation`             | `global.component.side-navigation`               | [SideNavigation.anatomy.yaml](./SideNavigation.anatomy.yaml) |
| `SideNavigation.Header`      | `global.subcomponent.side-navigation-header`     | [SideNavigationHeader.anatomy.yaml](./common/Header/SideNavigationHeader.anatomy.yaml) |
| `SideNavigation.Content`     | `global.subcomponent.side-navigation-content`    | [SideNavigationContent.anatomy.yaml](./common/Content/SideNavigationContent.anatomy.yaml) |
| `SideNavigation.Footer`      | `global.subcomponent.side-navigation-footer`     | [SideNavigationFooter.anatomy.yaml](./common/Footer/SideNavigationFooter.anatomy.yaml) |
| `SideNavigation.Item`        | `global.subcomponent.side-navigation-item`       | *(anatomy deferred — defined when item is specified)* |

### Layout constraints

**Container**

| Property               | Value            | Notes                                       |
|------------------------|------------------|---------------------------------------------|
| `size.height`          | `fill`           | Occupies 100% of parent height              |
| `layout.type`          | `stack`          | Vertical column                             |

**Header**

| Property                  | Value                          | Notes                                             |
|---------------------------|--------------------------------|---------------------------------------------------|
| `layout.type`             | `flow`                         | Horizontal flex                                   |
| `layout.direction`        | `row`                          |                                                   |
| `layout.align`            | `center`                       | Items vertically centred                          |
| `layout.justify`          | `space-between`                | Brand at flex-start, collapse toggle at flex-end  |
| `spacing.internal`        | `spacing/side-navigation/header?` | Token TBD — see ADR-T06                        |
| `brand`                   | cardinality `0..1`             | Optional logo or icon at flex-start               |
| `collapse toggle`         | cardinality `1`                | Required icon/button to collapse the nav          |

**Content**

| Property                  | Value  | Notes                                                                                    |
|---------------------------|--------|-----------------------------------------------------------------------------------------|
| `layout.flex`             | `1`    | Grows to fill space between header and footer                                            |
| `layout.overflow`         | `auto` | Scrolls independently when content overflows                                             |
| prop: `root`              | `Item` | WD405 root item — its `items[]` children are rendered as the nav item list               |
| nav item list             | `0..*` items | Root node itself is not rendered; only its direct children are                     |

**Footer**

| Property | Value | Notes |
|----------|-------|-------|
| cardinality | `0..1` | Optional |
| prop: `root` | `Item` | WD405 root item — same contract as Content; root not rendered, only its children |

---

## 2. Token Pairings

### ADR-T01 — Background colors · *Approved*

| Token | Applied to | Notes |
|-------|-----------|-------|
| `color.foreground.navigation.primary.$root` | First-level navigation background | Active background |
| `color.foreground.navigation.secondary.$root` | Second-level navigation background | **Noted — not used in initial implementation** |

### ADR-T02 — Borders and dividers · *Noted — not used in initial implementation*

| Token | Applied to |
|-------|-----------|
| `color.border.muted.$root` | Borders between subcomponents (e.g. Header/Content divider) and internal dividers |

### ADR-T03 — Text color · *Approved*

| Token | Applied to |
|-------|-----------|
| `color.text.$root` | All navigation item labels |

### ADR-T04 — Icon color · *Approved*

| Token | Applied to |
|-------|-----------|
| `color.icon.$root` | Icons rendered within navigation items |

### ADR-T06 — Header internal padding · *Token TBD*

| Token | Applied to | Notes |
|-------|-----------|-------|
| `spacing/side-navigation/header` | Padding inside `SideNavigation.Header` | Token path not yet defined; marked optional (`?`) in the DSL |

### ADR-T05 — Typography · *Approved*

| Token | Applied to |
|-------|-----------|
| `typography.text.primary.$root` | Default navigation item text |
| `typography.heading.5.$root` | Section headings within the navigation |

---

## 3. Properties

*Deferred.*

---

## 4. State Management & Keyboard Navigation

*Deferred.*

---

## 5. Accessibility

*Deferred.*
