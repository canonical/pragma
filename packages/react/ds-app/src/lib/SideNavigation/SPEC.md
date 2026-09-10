# SideNavigation — Component Specification

> **Status:** Implemented against the 24.04 design spec. Anatomy and token
> pairings from the original draft are retained below; the previously
> deferred Properties, State & Keyboard, and Accessibility sections are now
> specified.

---

## Table of Contents

1. [Anatomy](#1-anatomy)
2. [Token Pairings](#2-token-pairings)
3. [Properties](#3-properties)
4. [State Management & Keyboard Navigation](#4-state-management--keyboard-navigation)
5. [Accessibility](#5-accessibility)

---

## 1. Anatomy

The `SideNavigation` is a full-height container that partitions its vertical space among three subcomponents. Header and Footer are optional; Content is required and grows to fill the remaining space.

The component's root element is a plain `<div>` layout container — it is
**not** a landmark. The component's single navigation landmark is
Content's `<nav>`. The header's branding and the footer's actions are
deliberately kept outside it, so assistive technology announces exactly one
navigation region.

```
┌─────────────────────────────────────────┐ ─┐
│  [visually hidden] Skip to main content │  │ first in DOM order
├─────────────────────────────────────────┤ ─┤
│  SideNavigation.Header                  │  │ required
│  ┌─────────────┐         ┌────────────┐ │  │
│  │    brand    │         │  collapse  │ │  │
│  │  (logo/icon)│         │   toggle   │ │  │
│  └─────────────┘         └────────────┘ │  │
│  flex-start                  flex-end   │  │
├─────────────────────────────────────────┤ ─┤
│  SideNavigation.ContextSwitcher <div>   │  │ optional · NOT a landmark
├─────────────────────────────────────────┤ ─┤
│  SideNavigation.Content   <nav>         │  │ required · flex: 1 · overflow: auto
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

### Region semantics

Each region has a fixed element and vocabulary. These constraints are
deliberate and enforced by the component API:

| Region  | Element    | Vocabulary                                                                 | Explicitly excluded |
|---------|------------|-----------------------------------------------------------------------------|---------------------|
| Header  | `<header>` | brand, application name, `CollapseToggle`                                   | navigation rows     |
| ContextSwitcher | plain `<div>` (not a landmark) | `ContextSwitcherProps` — title, contexts, callbacks | navigation rows; rendered content inside the `<nav>` |
| Content | `<nav>`    | `Item` (link or plain label), `ItemExpandable`, `Group`, `GroupHeader` | `<button>`-based rows — actions are Footer's job |
| Footer  | `<footer>` | `Item` (link), `ItemButton`, free-form `footerRoot` (leaves + depth-1 expandables, buttons via `control`) | expandables deeper than one level |

**Strict Content vocabulary.** Content rows are links (rendered through
`LinkComponent`, default `"a"`) or plain non-navigable labels. Interactive,
non-navigational controls — buttons, toggles — belong exclusively to the
Footer. Keeping "navigate here" and "do this action" in separate regions
prevents screen-reader users from conflating them inside the navigation
landmark. A toggle-style row is composed with `ItemButton` whose `slot`
renders the control.

**The ContextSwitcher is its own region.** The switcher is a select-like
widget (`role="menu"` popup), not navigation — so it renders in its own
plain-`<div>` region **between Header and Content, outside the `<nav>`
landmark**. Screen readers traversing "Main navigation" never encounter a
menu widget mid-nav. Its rows keep the APG menu pattern (`role="menuitem"`
divs), which is why a context entry carries its `url` as **data** that
rides through `onContextChange` for the consumer's router — there is no
render target for a `LinkComponent` inside a `role="menu"`. The region
hides when the rail collapses (its rows are label-driven and unviable
icon-only).

### Subcomponents

Every subcomponent is **private**
(`cs:react.component.subcomponent_export_api`): none carries a
dot-static export or a named export — not the regions (`Header`,
`ContextSwitcher`, `Content`, `Footer`) and not the row-level components
(`Item`, `ItemExpandable`, `Group`, `GroupHeader`, `ItemButton`,
`CollapseToggle`). All render exclusively from data (`root`, `footerRoot`,
`contextSwitcher`); there is no public surface to compose
them by hand.

### Anatomy files

| Component                    | URI                                              | File |
|------------------------------|--------------------------------------------------|------|
| `SideNavigation`             | `global.component.side-navigation`               | [SideNavigation.anatomy.yaml](./SideNavigation.anatomy.yaml) |
| `SideNavigation.Header`      | `global.subcomponent.side-navigation-header`     | [SideNavigationHeader.anatomy.yaml](./common/Header/SideNavigationHeader.anatomy.yaml) |
| `SideNavigation.Content`     | `global.subcomponent.side-navigation-content`    | [SideNavigationContent.anatomy.yaml](./common/Content/SideNavigationContent.anatomy.yaml) |
| `SideNavigation.Footer`      | `global.subcomponent.side-navigation-footer`     | [SideNavigationFooter.anatomy.yaml](./common/Footer/SideNavigationFooter.anatomy.yaml) |
| `SideNavigation.CollapseToggle` | `global.subcomponent.side-navigation-collapse-toggle` | [SideNavigationCollapseToggle.anatomy.yaml](./common/CollapseToggle/SideNavigationCollapseToggle.anatomy.yaml) |
| `SideNavigation.ContextSwitcher` | `global.subcomponent.side-navigation-context-switcher` | [SideNavigationContextSwitcher.anatomy.yaml](./common/ContextSwitcher/SideNavigationContextSwitcher.anatomy.yaml) |
| `SideNavigation.Group`       | `global.subcomponent.side-navigation-group`      | [SideNavigationGroup.anatomy.yaml](./common/Group/SideNavigationGroup.anatomy.yaml) |
| `SideNavigation.GroupHeader` | `global.subcomponent.side-navigation-group-header` | [SideNavigationGroupHeader.anatomy.yaml](./common/GroupHeader/SideNavigationGroupHeader.anatomy.yaml) |
| `SideNavigation.Item`        | `global.subcomponent.side-navigation-item`       | [SideNavigationItem.anatomy.yaml](./common/Item/SideNavigationItem.anatomy.yaml) |
| `SideNavigation.ItemButton`  | `global.subcomponent.side-navigation-item-button` | [SideNavigationItemButton.anatomy.yaml](./common/ItemButton/SideNavigationItemButton.anatomy.yaml) |
| `SideNavigation.ItemExpandable` | `global.subcomponent.side-navigation-item-expandable` | [SideNavigationItemExpandable.anatomy.yaml](./common/ItemExpandable/SideNavigationItemExpandable.anatomy.yaml) |

`GroupHeader` is a semantic divider — it carries no tooltip and has no
standalone interactive story; its rendering is covered by the grouped
stories.

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

### Consumption pattern

One blessed way to consume a `SideNavigation`: **data-driven**. Pass props
on the component itself (`brand`, `root`, `contextSwitcher`, `footerRoot`,
…) and it builds all four regions in DOM order. There are no
dot-static exports — every subcomponent is private (§1) — so region- or
row-level composition by hand is not part of the API.

There is no JSX escape hatch into a semantic region — hand-authored
children bypass the strict vocabulary, lose the DS wiring (active
resolution, keyboard traversal, branch expansion) and cannot be correctly
authored from the private surface, so the API carries no children props at
all.

### `SideNavigation`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `root` | `NavRoot` | — | WD405 root; its direct children (groups) render as the item list. |
| `contextSwitcher` | `ContextSwitcherProps` | — | Typed props for the switcher region, rendered between Header and Content (outside the `<nav>` landmark). Omitted renders no region. |
| `brand` | `ReactNode` | — | Logo/wordmark in the Header. |
| `applicationName` | `ReactNode` | — | Application name shown beside the brand. |
| `footerRoot` | `FooterRoot` | — | The footer's only data surface: free-form leaves + depth-1 expandables, rendered as the footer's rows. Empty/omitted hides the Footer. |
| `LinkComponent` | `ComponentType<LinkComponentProps> \| "a"` | `"a"` | Renders navigable items; pass a router `Link` for client-side navigation. |
| `currentUrl` | `string` | — | Live location; resolves the active item (`aria-current="page"`) and expands its branch. |
| `defaultExpanded` | `boolean` | `true` | Initial rail state; see §4. |
| `keyboardShortcut` | `boolean` | `true` | Binds the Ctrl+B collapse shortcut (§4); pass `false` to opt out. |
| `skipTo` | `string` | `"#main-content"` | Skip-link target; see §5. |
| `aria-label` | `string` | `"Main navigation"` | Forwarded to Content's `<nav>`. |

The remaining native `<div>` attributes (`id`, `data-*`, `style`, …) pass
through to the root.

### Footer rows — `LeafFooterItem` / `ExpandableFooterItem` / `FooterItem`

Footer rows are free-form — the component supplies no closed vocabulary,
default labels, or icons. A certificate-user application, for instance,
composes the `certificate` icon and omits the logout item itself. The type
split mirrors the content tree's (`LeafNavItem`/`ExpandableNavItem`/`NavItem`):
`FooterItem` is the union of a leaf row and a depth-1 expandable; every
footer row flows through the single `footerRoot` surface.

**`LeafFooterItem`** (leaf — link, action, or plain label):

| Field | Type | Notes |
|-------|------|-------|
| `label` | `string` | Required — display text. |
| `icon` | `IconName` | Leading icon (start slot), by ds-assets icon name. |
| `url` | `string` | Navigable footer items render as links (active when the row is the current location). |
| `control` | `"link" \| "button"` | Defaults to `"link"` when `url` is set, `"button"` otherwise. |
| `onClick` | `() => void` | For action rows. |
| `slot` | `ReactNode` | Trailing content (e.g. unread-count badge). |

Three-way dispatch: a `url` (with `control` not `"button"`) renders as a
link; an action (`control: "button"`, or `onClick` with no `url`) renders
as a button; anything else — a label-only row like a logged-in username —
renders as a plain non-navigable label, never as an inert `<button>`
announced as an action that does nothing.

**`ExpandableFooterItem`** (disclosure — mirrors `ExpandableNavItem`): no
`url`/`control`/`onClick` (an expandable row is neither a page nor an
action) and no `slot` (the end slot is the disclosure caret). Carries
`label`, optional `icon`, and required `items: LeafFooterItem[]` — depth 1,
children are always leaves. A leaf child matching `currentUrl` is marked
active and its parent opens (seeded; re-opened on navigation by the
disclosure's one-way sync). Label-only children never match an unset
`currentUrl` — only a `url`-bearing child can seed its parent open.

### `ContextSwitcherItem`

Context entries are free-form. `url` is data polymorphism: selecting a
url'd context fires `onContextChange` with it aboard for the consumer's
router to handle (the menu's APG constraint — every row is a
`role="menuitem"` div — means there is no render target for a
`LinkComponent` inside the popup; the consumer's callback is the custom
router adapter).

| Field | Type | Notes |
|-------|------|-------|
| `key` | `string` | Required — list identity and selection matching. |
| `name` | `string` | Required — shown in the dropdown field when current. |
| `url` | `string` | Rides through `onContextChange`; the consumer routes. Omitted, the context stays a pure action. |
| `description` | `string` | Supporting text under the name in the list. |
| `badge` | `ReactNode` | Trailing badge (dynamic/actionable information). |

---

## 4. State Management & Keyboard Navigation

### Rail collapse

`SideNavigation` owns its expand/collapse (rail) state. It is uncontrolled —
seeded by `defaultExpanded` and flipped by the Header's `CollapseToggle`.
The root carries `data-expanded` (`"true"`/`"false"`) — the single source
of truth for the rail state; all collapsed styling keys off the attribute,
never a class. A controlled
`expanded`/`onExpandedChange` circuit is not part of the official API.

Collapsed, the rail narrows: Content is hidden entirely **for now** (a
deliberate scope cut — icons are not guaranteed on every item, and
icon-only buttons are poor UX). The footer stays visible, degraded to
**icon-only** (labels and trailing slots hidden).

**The collapse animates.** The width change transitions over
`--motion-duration-medium` (0.25s, `ease-in-out`) — a deliberate deviation
from the 24.04 spec, which states the rail transition is not animated.
The resize reads as motion rather than a jump, and it honours reduced
motion for free: the motion tokens are zeroed under
`prefers-reduced-motion: reduce` by `@canonical/styles`, so the
transition collapses to an instant swap there. (The caret's rotation and
the hover background swap are separate: the caret animates per the spec,
the hover swap is instant.)

**Popovers in the collapsed rail.** Any `ItemExpandable` that renders in
the collapsed rail — a footer expandable today (`footerRoot` rows);
Content's, if it ever shows collapsed — degrades its sub-items into a
floating **popover on the
inline-end** of the rail, and the popover's rows keep their **visible
labels**. This is collapsed-only behaviour: expanded, the disclosure stays
inline exactly as always. The disclosure is a native
`<details>`/`<summary>` element (no `role` or `aria-expanded` authored; the
element supplies correct disclosure semantics unscripted), and the popover
is purely CSS — the tree stays in the DOM, and Tab reaches the panel's
links from the summary. There is deliberately no Esc-close or
outside-click dismissal: native `<details>` keeps Tab navigation viable,
which is the requirement.

**Overflow handling — CSS anchor positioning.** Each summary carries a
unique `anchor-name` (generated per instance) and its panel is
`position-anchor`ed to it; where the feature is available (Baseline 2026 —
Chrome/Edge 125+, Safari 26+, Firefox 147+; ~86% global), a
`position-try-fallbacks: flip-block` fallback flips the panel **above**
its trigger when it would overflow the viewport — browser-measured, so it
moves up by exactly the space it needs plus the 0.5rem gap, with a
viewport-height cap (`max-block-size` + internal scroll) for panels taller
than both sides. Browsers without the feature keep the static
top-anchored panel (current absolute positioning) — `@supports`-gated, no
JS anywhere.

### Keyboard shortcut — Ctrl+B

The rail-collapse keyboard shortcut is **Ctrl+B**. It is **on by default**
(`keyboardShortcut`, default `true`); pass `false` to opt out.

### Selection & active state

The active item is resolved from `currentUrl` and marked
`aria-current="page"` (with `data-active` on its row); when the active item
is a sub-item under an `ItemExpandable`, it is highlighted under its
automatically expanded parent. Keep `currentUrl` in sync with the consumer's
router so active state tracks navigation.

### Responsive behaviour

Below the small breakpoint (767px) the rail stops being a rail: expanded, it
takes over the full screen as a fixed overlay until dismissed; collapsed,
the header shows and the body is hidden. Drill-down navigation for
expandable items (chevron + back button) is out of scope.

---

## 5. Accessibility

### One navigation landmark

The component renders exactly **one** `navigation` landmark: Content's
`<nav>`, labelled `"Main navigation"` by default and overridable via
`aria-label`. The root is a plain `<div>` — deliberately not an `<aside>`
and not a landmark of its own — so screen readers announce a single,
unambiguous navigation region rather than nested or competing landmarks.
Branding (Header) and actions (Footer) sit outside the landmark by design.

### Skip navigation

A visually hidden **"Skip to main content"** link is the **first focusable
element in the component's DOM order**. Hidden until keyboard focus (then
overlaid on the rail), it jumps to the `skipTo` target — default
`#main-content`, the conventional id for the application's `<main>` region —
letting keyboard users bypass the entire navigation block with one Tab +
Enter.

### Landmark vocabulary discipline

- Content is **strictly navigational**: links and expandable disclosures
  only. No `<button>` rows — non-navigational actions live in the Footer,
  outside the landmark, so the landmark's contents always read as
  destinations.
- Expandable items use native `<details>`/`<summary>`: the browser supplies
  the disclosure role and expanded state, correctly, without script.
- The active item carries `aria-current="page"`.
- The collapse toggle's `aria-controls` points at the content region it
  controls.

### Focus order

Focus moves skip link → header (brand → collapse toggle) → content items
top-to-bottom → footer items top-to-bottom, matching DOM order.

---

## 6. Deliberate exclusions

- **No buttons in Content** — action rows live in the Footer only (§1, §5).
- **No navigation content when collapsed (for now)** — Content hides; the
  footer stays, icon-only, with `ItemExpandable` sub-items degrading into
  an inline-end popover (§4).
- **No popover dismissal keys** — the collapsed popover is a native
  `<details>` disclosure: no Esc-close, no outside-click dismissal; Tab
  navigation stays viable (§4).
- **No `GroupHeader` interactive story or tooltip** — semantic divider,
  covered by the grouped stories (§1).
- **No controlled expansion circuit** — uncontrolled only, pending design.
- **No collapsed-state tooltips on footer items** — the 800ms-delay tooltip
  enhancement is tracked separately.
- **No drill-down navigation on small screens** — out of scope (§4).
