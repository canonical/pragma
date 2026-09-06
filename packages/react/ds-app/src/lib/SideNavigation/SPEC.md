# SideNavigation — Component Specification

> **Status:** Implemented, against the 24.04 Side Navigation spec (Figma:
> [App Mafia exploration](https://www.figma.com/design/4BxGmZUlhgWChPWu4lGzZv/24.04-Side-Navigation-exploration---App-Mafia?node-id=656-31955),
> prose spec: *Side Navigation (App Layout)*). All 8 PRs in
> [§8 Implementation status](#8-implementation-status) have landed; several
> spec details are deliberately deferred with rationale rather than rushed —
> see [§10 Known issues](#10-known-issues) for the full list (mobile
> drill-down, pixel-accurate truncation tooltips, collapsed-footer tooltips,
> `brandHref`, and several inferred values pending design confirmation).

---

## Table of Contents

1. [Anatomy](#1-anatomy)
2. [Layout & Spacing](#2-layout--spacing)
3. [Token Pairings](#3-token-pairings)
4. [Properties](#4-properties)
5. [State Management & Keyboard Navigation](#5-state-management--keyboard-navigation)
6. [Accessibility](#6-accessibility)
7. [Responsive](#7-responsive)
8. [Implementation status](#8-implementation-status)
9. [Token inference log](#9-token-inference-log)
10. [Known issues](#10-known-issues)

---

## 1. Anatomy

`SideNavigation` is a self-contained `<nav>` landmark (`aria-label="Main
navigation"`) occupying the full viewport height on the left edge of the
application. It has two independent levels:

- **Primary navigation** — always mounted (unless the user is signed out).
  Own top-level component. Can be expanded or collapsed (a rail state it owns
  and that cannot be disabled).
- **Secondary navigation** — a second, sibling `<nav>` landmark
  (`aria-label` = its `title`), shown when a primary item designates it.
  Cannot collapse; closes when the user activates any primary item that does
  not open a (possibly different) secondary navigation.

### 1.1 Primary navigation — expanded

```
┌─────────────────────────────────────────┐ ─┐
│  SideNavigation.Header                  │  │ required
│  ┌──────┐              ┌──────────────┐ │  │
│  │ logo │              │   collapse   │ │  │
│  └──────┘              └──────────────┘ │  │
├─────────────────────────────────────────┤ ─┤
│  SideNavigation.Content                 │  │ required · flex:1 · overflow-y:auto
│  ┌─────────────────────────────────────┐│  │
│  │ SideNavigation.ContextSwitcher       ││  │  0..1, content-defined position
│  │ SideNavigation.GroupHeader           ││  │
│  │ SideNavigation.Group                 ││  │
│  │  ├─ Item / ItemExpandable / …        ││  │
│  │ SideNavigation.Separator             ││  │
│  │ SideNavigation.Group ("Help")        ││  │  mandatory, collapsible,
│  │  └─ external legal link              ││  │  contains ≥1 external link
│  └─────────────────────────────────────┘│  │
├─────────────────────────────────────────┤ ─┤
│  SideNavigation.Footer                  │  │ optional (hidden if no footerItems)
│  ┌─────────────────────────────────────┐│  │  account · notifications · logout
│  └─────────────────────────────────────┘│  │
└─────────────────────────────────────────┘ ─┘
```

Content is a free composition (see §4.3) of: **Group header**, **context
switcher**, **navigation item** (plain, expandable, button, or switch
variant), and **separator**. The only mandatory content item is a
collapsible **"Help"** navigation item that contains, at minimum, one
external link to legal information.

### 1.2 Primary navigation — collapsed

```
┌──────────┐ ─┐
│   logo   │  │  centred; rail width = logo width + 1 unit each side
├──────────┤ ─┤
│    ⌄     │  │  expand button, moved here (was beside the logo)
├──────────┤ ─┤
│          │  │  no navigation items — see §7 collapsed rationale
│  (empty) │  │
├──────────┤ ─┤
│  footer  │  │  icons only; labels via tooltip
└──────────┘ ─┘
```

No navigation items render while collapsed — not a styling choice, a
deliberate scope cut (see §4.5 and §10). Only the logo, the (relocated)
expand control, and the footer icons remain.

### 1.3 Secondary navigation

```
┌─────────────────────────────────────────┐ ─┐
│  SideNavigation.Secondary.Header        │  │ required — title text
├─────────────────────────────────────────┤ ─┤
│  SideNavigation.Secondary.Content       │  │ required
│  ┌─────────────────────────────────────┐│  │
│  │ GroupHeader / Item (no icon, no     ││  │
│  │ expandable, no context switcher)     ││  │
│  └─────────────────────────────────────┘│  │
└─────────────────────────────────────────┘ ─┘
```

The secondary title usually mirrors the label of the primary item that
opened it, but may instead describe the nature of the items shown (e.g. a
primary item literally named after the signed-in user opens a secondary nav
titled "Account settings").

### 1.4 Subcomponents

| Component | Root element | Cardinality | URI (local; see §10.7) |
|---|---|---|---|
| `SideNavigation` | `<nav>` | — | `apps.pattern.side-navigation` |
| `SideNavigation.Header` | `<header>` | 1 | `apps.subcomponent.side-navigation-header` |
| `SideNavigation.Content` | `<div>` | 1 | `apps.subcomponent.side-navigation-content` |
| `SideNavigation.Footer` | `<div>` | 0..1 | `apps.subcomponent.side-navigation-footer` |
| `SideNavigation.CollapseToggle` | `<button>` | 1 | `apps.subcomponent.side-navigation-collapse-toggle` |
| `SideNavigation.Group` | `<section>` | 0..* | `apps.subcomponent.side-navigation-group` *(new)* |
| `SideNavigation.GroupHeader` | `<span>` | 0..1 per group | `apps.subcomponent.side-navigation-group-header` *(new)* |
| `SideNavigation.Separator` | `<hr>` | 0..* | `apps.subcomponent.side-navigation-separator` *(new)* |
| `SideNavigation.Item` | `LinkComponent` \| `<span>` | 0..* | `apps.subcomponent.side-navigation-item` |
| `SideNavigation.ItemExpandable` | `<details>`/`<summary>` | 0..* | `apps.subcomponent.side-navigation-item-expandable` *(new)* |
| `SideNavigation.ItemButton` | `<button type="button">` | 0..* | `apps.subcomponent.side-navigation-item-button` *(new)* |
| `SideNavigation.ItemSwitch` | row + `SwitchInput` | 0..* | `apps.subcomponent.side-navigation-item-switch` *(new)* |
| `SideNavigation.ContextSwitcher` | `<details>`/`<summary>` (via `Popover`) | 0..1 | `apps.subcomponent.side-navigation-context-switcher` *(new)* |
| `SideNavigation.Secondary` | `<nav>` | 0..1 | `apps.pattern.side-navigation-secondary` *(new)* |

Anatomy files: existing components keep their current `.anatomy.yaml`
(amended where the model changed — Content/Footer now permit `Group`,
`Separator`, and `ContextSwitcher` edges, not just flat items). New
subcomponents get their `.anatomy.yaml` alongside their implementation, in
the PR that adds them (see §8) — matching this repo's existing convention of
co-locating the anatomy file with the `.tsx` it describes, rather than
forward-declaring empty component folders.

---

## 2. Layout & Spacing

All values below are stated exactly in the source spec (not re-derived) and
mapped to the nearest existing dimension token where an exact match exists.
Where none exists, see §9.

| Region / relationship | Value | Token |
|---|---|---|
| Rail width, expanded | 240px | `15rem` *(new — §9.1)* |
| Rail width, collapsed | logo width + 1 unit each side, logo centred | *(derived — §9.2)* |
| Nav height | 100% of viewport | `100%` (parent-owned; the shell caps it, see `ApplicationLayout`) |
| Logo height | 2.25rem | *(new — §9.3)* |
| Logo aspect ratio | 1:2 (width:height) → width = 1.125rem | *(derived — §9.3)* |
| Logo ↔ collapse button gap | 1rem | `--dimension-200` |
| Header top inset (aligns collapse icon with item icons/logo) | 0.5rem | `--dimension-100` |
| Footer bottom inset | 0.5rem | `--dimension-100` |
| Gap between footer items | 0 | — |
| Gap below logo / above first footer item | 1rem | `--dimension-200` |
| Header/footer overflow gradient height | 1.75rem | *(override — §9.4)* |
| Group: top inset (header/switcher/items) | 0.5rem | `--dimension-100` |
| Group: bottom inset | 1rem | `--dimension-200` |
| Group: divider line | top of every group **except the first** | `--color-border-muted` |
| Gap between items within a group | 0 | — |
| Item: left inset | 1rem | `--dimension-200` |
| Item: icon ↔ label gap | 0.5rem | `--dimension-100` |
| Item: right inset (aligns with context-switcher/collapse icons) | 1.5rem | `--dimension-300` |
| Breakpoint below which the mobile layout applies | < 768px (Vanilla `small`) | — |

---

## 3. Token Pairings

### ADR-T01 — Background colors · *Approved*

| Token | Applied to |
|---|---|
| `color.foreground.navigation.primary.$root` | Primary rail background (base) |
| `color.foreground.navigation.primary.$hover` | Item/footer-item row on hover |
| `color.foreground.navigation.primary.$active` | Item row on press; current-page item |
| `color.foreground.navigation.primary.$disabled` | Disabled item row |
| `color.foreground.navigation.secondary.$root` | Secondary rail background (base) |
| `color.foreground.navigation.secondary.$hover` / `$active` / `$disabled` | Secondary item row states |

### ADR-T02 — Borders and dividers · *Approved (was: not used)*

| Token | Applied to |
|---|---|
| `color.border.muted.$root` | Group top divider (all groups except the first); Header/Content and Content/Footer seams are **not** divided per spec (gradient fade instead, ADR-T07) |

### ADR-T03 — Text color · *Approved*

| Token | Applied to |
|---|---|
| `color.text.$root` | Navigation item labels, group headers, secondary title |
| `color.text.muted.$root` | Context-switcher item description |
| `color.text.disabled.$root` | Disabled item label |

### ADR-T04 — Icon color · *Approved*

| Token | Applied to |
|---|---|
| `color.icon.$root` | Item leading icons, chevrons, collapse/expand glyph |
| `color.icon.muted.$root` | Context-switcher chevron |
| `color.icon.disabled.$root` | Disabled item icon |

### ADR-T05 — Typography · *Approved*

| Token | Applied to |
|---|---|
| `typography.text.primary.$root` | Item labels, footer item labels |
| `typography.heading.5.$root` | Group headers, secondary navigation title |

### ADR-T06 — Header internal padding · *Resolved*

Superseded by the exact measurements in §2 (header top inset 0.5rem, logo↔toggle
gap 1rem) — no separate padding token needed; the header uses the same
`--dimension-100`/`--dimension-200` primitives as the rest of the rail.

### ADR-T07 — Overflow fade · *Approved*

| Token | Applied to |
|---|---|
| `surface.overflow_gradient.$root` (`--surface-overflow-gradient`) | Header/Footer seam fades, height overridden to 1.75rem (§9.4) |

### ADR-T08 — Motion · *Approved, scoped*

| Token | Applied to |
|---|---|
| `--motion-duration-fast` / `--motion-easing-standard` | `ItemExpandable` chevron rotation only — gated behind `prefers-reduced-motion: no-preference` |
| *(none)* | Rail collapse/expand, collapse-button hover background, tooltip appearance — spec states no transition (§10.4) |

---

## 4. Properties

### 4.1 `SideNavigation` (primary)

| Prop | Spec property | Type | Default | Notes |
|---|---|---|---|---|
| `brand` | `logo` | `ReactNode` | — | **Deviation** — spec is a closed 21-product single-select (`Product` variant, `logo` component set, node `655:46599`); kept as `ReactNode` for consumer flexibility (§10.5) |
| `brandHref` | `logo-target` | — | — | **Not implemented** — the consumer's `brand` node owns its own link markup entirely (e.g. its own `<a href>`); SideNavigation never wraps it. A real `brandHref` would need SideNavigation to own that wrapping instead, a bigger change than any current acceptance criterion calls for. Tracked in §10.15 |
| `applicationName` | — | `ReactNode` | — | Pre-existing, not in spec; kept |
| `root` | `content` | `NavRoot` | — | WD405 root; direct children render as groups (§4.3) |
| `footerItems` | `footer-items` | `FooterItem[]` | `[]` (footer hidden) | Closed vocabulary per spec (`FooterItem` carries each item's own `url`/`onClick`/`label`/`slot` — see §4.1's `FooterItem` below) — see §10.6 for the `footerRoot` escape hatch |
| `certificateUser` | *(implied by "certificate user" usage note)* | `boolean` | `false` | Swaps the account icon `user` → `certificate`; drops any `logout` item from `footerItems` |
| `LinkComponent` | — | `ComponentType<LinkComponentProps> \| "a"` | `"a"` | Router integration, per `cs:react.component.link_component` |
| `currentUrl` | — | `string` | — | Drives `aria-current` + active state |
| `defaultExpanded` | `is-open` | `boolean` | `true` | Uncontrolled; the DS has no controlled variant (deferred — see the commented-out controlled circuit in `SideNavigation.tsx`) |
| `keyboardShortcut` | *(unratified — §10.1)* | `boolean` | **`false`** | Reserved. When `true`, binds the collapse shortcut in `COLLAPSE_SHORTCUT`. Ships disabled; no story enables it until design ratifies the key |

```ts
interface FooterItem {
  kind: "account" | "notifications" | "logout";
  url?: string; // present ⇒ renders as a link (Item)
  label?: string; // defaults per kind: "Account settings" / "Notifications" / "Log out"
  onClick?: () => void; // present (no url) ⇒ renders as a button (ItemButton)
  slot?: ReactNode; // e.g. an unread-count badge on notifications
}
```

### 4.2 `SideNavigation.Secondary`

| Prop | Spec property | Type | Notes |
|---|---|---|---|
| `title` | `title` | `string` | Rendered in the header; also the default `aria-label` |
| `root` | `content` | `SecondaryNavRoot` | Direct children render as groups (and separators); a group's entries must not be `icon`- or `items`-bearing — enforced by the narrower `SecondaryNavItem` type (`LeafNavItem` without `icon`, and with no expandable variant at all) |

Mounting and unmounting `SideNavigation.Secondary` — "hides on primary
click" (§5) — is entirely a consumer decision: which (if any) primary item
is active determines whether the consumer renders it at all, alongside
`SideNavigation`, in the application shell. There is no `onClose` prop:
Secondary has no internal control that would call it, and the event that
triggers hiding (activating a *primary* item without a secondary target)
happens on the primary nav's side, not Secondary's own.

### 4.3 `NavItem` (content vocabulary)

`root.items` are **groups** (rendered by `SideNavigation.GroupHeader` +
`SideNavigation.Group`); each group's `items` are the actual navigation
entries. A `SideNavigation.Separator` is a sibling entry in `root.items`
that renders as an `<hr>` instead of a group.

| Field | Spec property | Type | Notes |
|---|---|---|---|
| `key` / `url` | — / `target` | `string?` | `url` present ⇒ navigable; absent ⇒ non-navigable label. `expandable` items MUST NOT have `url` (see the `LeafNavItem` / `ExpandableNavItem` union below) |
| `label` | `item-text` | `ReactNode` | |
| `icon` | `icon` (+ `show-icon`, `indented`) | `IconName?` | `show-icon`/`indented` are Figma authoring properties that collapse to "is `icon` set" in the React API — see §10.8 |
| `slot` | `badge` | `ReactNode?` | Ignored when `items` is present (caret takes the end slot instead). Recommended: pass a `ds:global.component.badge` |
| `items` | `children` | `LeafNavItem[]?` | Presence makes this an `ExpandableNavItem`. **Depth is exactly 1** — a `LeafNavItem` cannot itself carry `items` (type-level, not just documented) |
| `control` | *(new — §4.4)* | `"link" \| "button" \| "switch"` | Default `"link"`. Selects the rendered subcomponent |
| `disabled` | — | `boolean?` | |

```ts
type LeafNavItem = Omit<Item, "items"> & {
  icon?: IconName;
  slot?: ReactNode;
  control?: "link" | "button" | "switch";
  className?: string;
};

type ExpandableNavItem = Omit<LeafNavItem, "url" | "control"> & {
  /** Depth-1: children are leaves — they cannot themselves be expandable. */
  items: LeafNavItem[];
};

type NavItem = LeafNavItem | ExpandableNavItem;
```

This is a **breaking type change** from the current `NavItem.items?:
NavItem[]` (unbounded recursion): it lands in the PR that implements
`ItemExpandable` (§8, PR4) and is called out with `!` in that commit's title.
Existing fixtures/stories with depth > 2 will fail to compile — which is the
enforcement mechanism for the spec's depth-1 constraint, not a side effect.

### 4.4 Control variants

| `control` | Renders | Notes |
|---|---|---|
| `"link"` (default) | `SideNavigation.Item` (existing) | Navigable (`url` set) or a plain label (`url` absent) |
| `"button"` | `SideNavigation.ItemButton` | Requires `onClick`; never has `url` |
| `"switch"` | `SideNavigation.ItemSwitch` | Requires `checked` + `onCheckedChange`; renders `@canonical/react-ds-global-form`'s `SwitchInput` in the row's end slot |

`expandable` items are **not** a `control` value — expandability is
orthogonal (driven by `items`), whereas `control` selects the leaf row's
interactive element. An item cannot be both expandable and a button/switch
control (an `ExpandableNavItem` has no `control` field, enforced by the type
above).

### 4.5 `SideNavigation.ContextSwitcher`

| Prop | Spec property | Type | Notes |
|---|---|---|---|
| `currentContext` | `current-context` | `ContextSwitcherItem` | |
| `contexts` | `contexts` | `ContextSwitcherItem[]` | User-generated list |
| `onContextChange` | *(click a context item)* | `(context: ContextSwitcherItem) => void` | |
| `open` / `onOpenChange` | `is-open` | `boolean` / `(open: boolean) => void` | Uncontrolled by default, mirrors `Popover` |
| `onCreateContext` | *("create context" button)* | `() => void` | |
| `createContextLabel` | — | `ReactNode` | Default `"Create context"` |

```ts
interface ContextSwitcherItem {
  key: string;
  name: string; // context-name
  description?: string; // context-description
  badge?: ReactNode; // badge
}
```

Implemented as a standalone, independently-composable subcomponent — **not**
currently a `root.items` entry kind. §1.1's "content-defined position" is
realised by composing `SideNavigation.ContextSwitcher` directly where wanted
(e.g. via `SideNavigation.Content`'s `children` fallback), not by adding a
fourth entry kind to `NavGroup`/`NavItem` alongside groups and separators.
`ContextSwitcherItem` has a fundamentally different shape/state contract
than a nav entry (no `url`/`disabled`/`icon`, a `currentContext`/`contexts`
pair rather than a flat list) — folding it into the existing tiered model
would have added a fourth heterogeneous shape to `_AnyNavNode` for a widget
that isn't tree-shaped at all. Flagged in §10 as a scope boundary, not an
oversight.

### 4.6 Collapsed state

No new props — `expanded` (internal state) alone suppresses `Content`
entirely and repositions `CollapseToggle` below the logo (§1.2, §10.9).

---

## 5. State Management & Keyboard Navigation

- **Rail expand/collapse** — uncontrolled boolean, seeded by
  `defaultExpanded`. Owned entirely by `SideNavigation`; **cannot be
  disabled** by a consumer prop (matches the spec's "cannot be disabled"
  usage note — there is deliberately no `disableCollapse` escape hatch).
- **Active item** — derived from `currentUrl` via `useNavigationTree`
  (existing `NavTree` mechanism), extended to also expand the `ItemExpandable`
  ancestor chain of the active leaf.
- **Expandable items** — each `ItemExpandable` is an independent, controlled
  `<details open={expanded} onToggle={...}>` (mirrors
  `Accordion.Item`'s existing pattern). No accordion semantics (multiple can
  be open at once) — the spec does not ask for single-open behaviour.
- **Secondary navigation visibility** — controlled by the consumer (owns
  which primary item is "active" and therefore which, if any, secondary tree
  to render); `SideNavigation` does not manage this — it is a sibling
  rendering decision at the application-shell level, analogous to how
  `ApplicationLayout` composes `navigation`.
- **Context switcher** — uncontrolled `open` state by default (via
  `Popover`), `current-context` is consumer-controlled (no context is
  auto-selected by the component).
- **Keyboard shortcut (collapse)** — **scaffolded, inert**:

  ```ts
  // common/hooks/useCollapseShortcut/useCollapseShortcut.ts
  export const COLLAPSE_SHORTCUT = { key: "e", ctrlKey: true } as const;
  ```

  `SideNavigation` calls `useCollapseShortcut({ enabled: keyboardShortcut,
  onTrigger: handleToggle })`; `keyboardShortcut` defaults to `false`, so no
  listener attaches and no keydown is ever handled. The single named constant
  is the one place the key changes if/when design ratifies "Ctrl+E" vs. a
  single letter (§10.1) — matching the spec's literal "Ctrl + E" only
  (`event.ctrlKey`, not also `event.metaKey`/Cmd); extending it to Cmd on
  macOS is a separate decision, not assumed here. Tested for both: enabling
  attaches and fires the
  handler, and — the guarantee that matters — the *default* (disabled) case
  never does, even on the exact key combination.
- **Enter key** — on a `link`/`button` item, activates it (native semantics —
  no custom handler needed). On an `ItemExpandable`'s `<summary>`, toggles
  open/closed (native `<details>` semantics) and, on opening via keyboard,
  moves focus to the first child (a `useEffect` on the `open` transition,
  since native `<details>` does not do this itself).
- **Reduced motion** — the `ItemExpandable` chevron rotation and any
  future collapse/expand transition are wrapped in `@media
  (prefers-reduced-motion: no-preference)`; the disclosure itself (native
  `<details>`) has no motion to disable.

---

## 6. Accessibility

- Root: `<nav aria-label="Main navigation">`. Secondary: `<nav
  aria-label={title}>` (falls back to a generic label if `title` is a
  non-string `ReactNode` — documented as a constraint: pass a string when
  screen-reader labelling matters).
- Logo and every icon rendered without an adjacent visible label carry
  `alt`/`aria-label`.
- `ItemExpandable` uses native `<details>`/`<summary>` — **no** `role` or
  `aria-expanded` authored (`cs:ui_blocks.nojs.disclosure`); the element
  supplies the semantics natively and correctly, including to assistive
  tech, without scripting.
- Focus order: logo → collapse toggle → content (top-to-bottom, all
  interactive elements) → footer (top-to-bottom). This falls out of DOM order
  given the anatomy in §1.1 — no `tabindex` management needed.
- `aria-current="page"` on the active `Item`'s link (existing behaviour,
  retained).
- Disabled items omit `href` (existing `cs:react.component.link_component`
  fallback semantics — a disabled item is a `<span>`, never a disabled link).
- Tooltips (collapsed-footer labels, truncated-text overflow) are additive —
  the underlying control remains operable and labelled without them; they
  are a progressive enhancement, not the accessible name's only source.

---

## 7. Responsive

Above 768px (Vanilla `small`): fixed 240px rail, as specified throughout.

Below 768px:

- The collapse/expand button is replaced by a **"Menu"** button. The header
  is always visible; the body (Content + Footer) is hidden until Menu is
  activated.
- Activating Menu opens the body **full-screen**; the button's label changes
  to **"Close menu"**. Same internal spacing/gradients/sticky-footer as
  desktop.
- The context switcher opens in place; its list overlays the nav content
  (not the whole screen).
- An item with children (`ExpandableNavItem` in this context, or one that
  designates a secondary nav) shows a **`chevron-right`** (not the desktop
  disclosure chevron). Activating it navigates to a **new nav "page"**
  showing just those children, with a **back button** (`chevron-left`) at
  the top. Both expandable items and secondary-nav-opening items behave
  identically on mobile — there is no separate secondary-nav affordance at
  this breakpoint.

## Text overflow

Group headers, item labels, and the secondary title are single-line and
truncate (`text-overflow: ellipsis`) — the spec expects designers to choose
labels that never overflow; truncation is a safety net, not a target state.
A truncated element, hovered ≥ 800ms, shows a tooltip with the full text
(same mechanism and delay as the collapsed-footer tooltip, §10.4).

---

## 8. Implementation status

This spec is delivered across a sequence of atomic PRs (tracked outside this
file):

| # | Scope | Status |
|---|---|---|
| 1 | This spec + amended existing anatomy YAMLs | ✅ done |
| 2 | `<nav>` landmark + `ComponentProps`-based prop types (AC1) | ✅ done |
| 3 | Provisional navigation tokens + full-spec styling (AC2) | ✅ this PR |
| 4 | Group/GroupHeader/Separator/ItemExpandable, depth-1 type | ✅ this PR |
| 5 | ItemButton/ItemSwitch/ContextSwitcher (AC3, AC4) | ✅ this PR |
| 6 | Collapsed rail behaviour, tooltips, inert shortcut scaffold | ✅ this PR (footer-item tooltips deferred — §10.14) |
| 7 | Secondary navigation, Help item, footerItems, certificate user | ✅ this PR (`brandHref` deferred — §10.15) |
| 8 | Responsive (<768px), text-overflow tooltips, focus-order/reduced-motion tests | ✅ this PR (mobile drill-down and pixel-accurate truncation tooltips deferred — §10.17, §10.18) |

---

## 9. Token inference log

Every value below is either a *new* provisional token (no semantic token
exists) or an *inference* (a semantic token chosen by name-matching, not
confirmed against the visual spec's colour images). All are candidates for
design consolidation — see §10.

### 9.1 — Rail width, expanded: `240px`

No existing token names an application-shell rail width. New provisional
token `--sidenav-rail-inline-size: 15rem` (240px), defined in
`packages/styles/main/src/navigation.css` alongside the other provisional
architecture layers (`spacing.css`, `overflow.css`, `motion.css`).

### 9.2 — Rail width, collapsed: derived

Spec states collapsed anatomy (logo, expand button, footer) but never states
the collapsed rail's width. Per explicit direction: **logo width + 1 spacing
unit on each side, logo horizontally centred.**

```
--sidenav-rail-inline-size-collapsed:
  calc(var(--sidenav-logo-inline-size) + 2 * var(--dimension-200));
```

With the logo width from §9.3 (1.125rem) and `--dimension-200` = 1rem, this
resolves to **3.125rem (50px)**. Flagged for design confirmation — a 50px
collapsed rail is narrower than most comparable products' collapsed rails
(commonly 56–64px), because it's sized to the logo rather than to the item
icon column (`--sidenav-icon-column-inline-size`, 1rem — see §9.8). If design
intends the *icon column* to be the collapsed-width reference instead of the
logo, this constant changes to reference `--sidenav-icon-column-inline-size`.

### 9.3 — Logo dimensions

Spec states logo height (`2.25rem`) but not width. Per explicit direction,
**aspect ratio 1:2 (width:height)** ⇒ width = height ÷ 2 = **1.125rem**.

```
--sidenav-logo-block-size: 2.25rem;
--sidenav-logo-inline-size: 1.125rem; /* 2.25rem / 2, per 1:2 aspect ratio */
```

No semantic or primitive token names a logo size; both are new provisional
tokens. The existing story-only `CanonicalLogo` placeholder
(`packages/react/ds-app/src/storybook/navigation/CanonicalLogo`) uses
different, older dimensions (`--mark-size`/`--logo-height` in baseline
units) and is out of scope here — it is a Storybook fixture, not the shipped
component; reconciling it is noted in §10.10 but not required for AC1/AC2.

### 9.4 — Overflow gradient height: `1.75rem`, and a symmetric top fade

`@canonical/styles`' `--overflow-gradient-height` is a global provisional
token set to `2rem` (`packages/styles/main/src/overflow.css:20`). The spec
calls for `1.75rem` specifically at the Header/Footer seams. Rather than
change the global default (used elsewhere, e.g. `DataTable`), `SideNavigation`
overrides it locally:

```
.ds.side-navigation {
  --overflow-gradient-height: 1.75rem;
}
```

This is a legitimate per-component override of an already-provisional token,
not a new one.

Separately: the spec's "Header/Footer spacing and gradient" section
describes the 1rem gap and the fade in one combined statement ("1rem below
the logo **and above the first footer item**... below/above that is a
1.75rem gradient"), naming both seams together. The pre-24.04 implementation
only had a fade at the *bottom* of `Content` (fading into the footer); this
pass adds a matching fade at the *top* of `Content` (fading in from under the
header), reading the spec's "below/above" as describing the same affordance
at both ends, not a header-only or footer-only effect. Flagged for design to
confirm a top fade is actually wanted — the spec's one image
(`§Header/Footer spacing and gradient`) isn't machine-readable so this is an
inference, not a visual confirmation, consistent with §9.5.

### 9.5 — Colour pairings (ADR-T01–T05)

The spec's §Colours section (primary and secondary navigation) is expressed
**only as images** (`image22.png`, `image19.png`, `image16.png` in the source
`.docx` — not machine-readable, and not reproduced here). The pairings in §3
are inferred by matching each state name (base/hover/active/disabled) in the
spec's prose (`§Interactions`) to the identically-suffixed token in
`@canonical/design-tokens@0.8.1`'s `modifiers.theme.css`
(`--color-foreground-navigation-{primary,secondary}{,-hover,-active,-disabled}`).
This is a **naming inference, not a visual confirmation** — flagged for
design to verify against the actual swatches.

### 9.6 — Context switcher surfaces

No tokens exist for a dropdown field / list / "create context" button
specific to navigation. Provisionally, `ContextSwitcher` reuses
`ContextualMenu`'s existing item tokens
(`--contextual-menu-item-color-background{,-hover,-active}`) rather than
inventing new ones, since both are ghost-style interactive rows over a
floating surface. Flagged for design to confirm this reuse is intentional
rather than the two ever needing to diverge.

### 9.7 — Item row vertical padding (no stated row height)

The spec states the item row's horizontal insets (1rem/1.5rem) and the
icon↔label gap (0.5rem) exactly, but never states a row *height*. The
pre-24.04 implementation had a fixed row height derived from
`--space-baseline` (documented as "5bU/40px") — but `--space-baseline` was
changed from 8px to 4px in a prior, unrelated pass
(`packages/styles/main/src/spacing.css` §"Baseline grid") without updating
that comment, so the derived value is now 20px, not 40px, and no longer a
credible row height for a 1rem icon plus label text. Rather than perpetuate
a stale derivation, the row's height is now intrinsic: `padding-block:
var(--sidenav-icon-gap)` (0.5rem top and bottom) around the icon/label/end
content. This is an inference, not a spec value — flagged for design.

### 9.8 — Fixed leading-icon column width: `1rem`

The item row's leading-icon column must be a **fixed** width — not
content-sized (`auto`) — so labels align down the rail whether or not a
given row has an icon (an empty icon slot must reserve the same space as a
present one). `1rem` is not a spec value; it matches the `Icon` component's
own default rendered size (`@canonical/react-ds-global`'s `--icon-size`
fallback, which is always `1rem` in practice — no consumer in this repo sets
`--size-icon-default`, the token it would otherwise prefer). New provisional
token `--sidenav-icon-column-inline-size`, scoped separately from the
spacing-dimension tokens since it names a sizing concern, not a spacing one.

### 9.9 — Group header text case: literal uppercase, confirmed against the source file

A direct re-check against the Figma file (`group-heading`, node `656:31955`)
found its text style sets `textCase: "UPPER"` — a literal transform of the
authored string ("Header" renders as "HEADER"), not a font feature. This was
missed in the original ADR-T05 pass: `typography.heading.5` supplies
`font-variant: small-caps` instead, which for a mixed-case label (e.g.
"Hardware") renders unevenly — only the leading capital stays full-height,
the rest becomes reduced-height caps — not the spec's uniform block
capitals. Fixed by adding `text-transform: uppercase` to
`GroupHeader/styles.css`, layered on top of the ADR-T05 token (still the
right choice for size/weight/line-height/letter-spacing; this only adds the
missing case transform). The DOM text itself stays mixed-case — a CSS
transform, not a data transform — so this doesn't affect a11y tree text,
search, or copy/paste.

Flagged, not fixed: the same Figma node's text fill is a mid grey
(`{r,g,b} ≈ 0.788` on the file's dark canvas, oklch L ≈ 82%), sitting
between `color.text` (white, ADR-T03) and `color.text.muted` (oklch L 64%)
— closer to neither, and not a swatch this pass can respell into a `color.*`
token pick with confidence. ADR-T03 currently assigns group headers
`color.text.$root` (the same token as item labels, which *are* full white in
the reference image) — worth a design re-check on whether group headers
should instead be `color.text.muted.$root`, but left as-authored (ADR-T03
is marked Approved) rather than overridden on inferred pixel math alone.

---

## 10. Known issues

Carried forward for design/engineering resolution; none block PR1.

1. **Keyboard shortcut is unratified.** The spec's prose states "Ctrl + E"
   toggles the rail, then in the same paragraph argues for a single letter
   ("A") instead, for the reasons a modifier combination is a poor choice in
   a web app. Per explicit direction, the binding is scaffolded
   (`COLLAPSE_SHORTCUT`, §5) but shipped **disabled by default**
   (`keyboardShortcut = false`) until design rules on the actual key.
2. **Collapsed rail width is derived, not specified** — see §9.2. Needs
   design sign-off, especially whether the sizing reference should be the
   logo or the item icon column.
3. **Colour pairings are inferred from token names, not confirmed against
   the spec's colour swatches** (images only) — see §9.5.
4. **Tooltip delay is inconsistent in the source spec**: 1000ms for the
   collapse button, 800ms for collapsed-footer labels and truncated text.
   Both are implemented as specified (not reconciled to one value) since the
   spec states them as separate, deliberate figures.
   Separately, "The transition is not animated" appears directly after the
   collapse button's hover/tooltip description; it is ambiguous whether this
   refers to the hover background-colour change, the tooltip's appearance,
   or both. Both are treated as instant (no CSS `transition`) — the more
   conservative reading, and consistent with the rail's own collapse/expand
   having no stated animation either.
5. **`logo` is a closed 21-product single-select in the spec (`Product`
   variant on the `logo` component set, node `655:46599` — Canonical,
   Ubuntu, Admin UI, and 18 named `Canonical <product>` entries, each with a
   `Tag only` boolean for the collapsed rail); the API is `brand:
   ReactNode`.** Kept as `ReactNode` — a closed enum would block any
   consumer outside the named 21 products and contradicts this being a
   general-purpose design-system component. Recorded as a deliberate
   deviation, not an oversight.
6. **`footer-items` is a closed 3-item vocabulary in the spec
   (Account/Notification/Log out) but the current implementation's
   `footerRoot` accepts an arbitrary `NavItem` tree.** §4.1 introduces
   `footerItems` as the spec-conformant, opinionated prop (required to
   implement `certificateUser`'s icon swap and logout suppression);
   `footerRoot` is kept as a documented escape hatch for footers that don't
   fit the closed vocabulary. New consumers should prefer `footerItems`.
7. **Ontology drift.** The knowledge graph (`ds:apps.component.side_navigation`)
   carries only a summary — no anatomy, modifiers, or subcomponents — while
   this file's `@implements` tags and anatomy YAMLs use
   `ds:apps.pattern.side-navigation` / `ds:apps.subcomponent.side-navigation-*`,
   none of which exist in the graph. Per explicit direction, these URIs are
   **left as-is** and this spec is the local source of truth; the resulting
   `ds:implementsBlock` triples generated by `scripts/collect-implementations.ts`
   are dangling until the pattern and its subcomponents are authored upstream
   in `canonical/design-system`. When they are, `Primary`/`Secondary` map
   naturally onto the existing `global.modifier_family.importance`
   (`Primary`/`Secondary`/`Tertiary`) rather than needing a bespoke modifier.
8. **`show-icon`/`indented` (Figma-only properties) collapse to "is `icon`
   set"** in the React API (§4.3) — there is no separate toggle. The spec's
   "don't mix icons within a group" constraint is recorded as an authoring
   guideline, not runtime-enforced (consistent with the original PR1 note in
   this file that structural constraints are enforced where cheap and
   documented where validation infrastructure would be disproportionate).
9. Confirm whether **collapsed-state suppression of navigation items** (§1.2)
   should someday support icon-only items as an opt-in, once every listed
   blocking reason (icons not guaranteed, context switchers, expandable-item
   ambiguity, expand-button relocation, icon-only affordance) is individually
   revisited — out of scope now, the spec is explicit that no navigation
   items show while collapsed.
10. The Storybook-only `CanonicalLogo` fixture's dimensions predate this spec
    and don't match §9.3 — not reconciled here since it's a story fixture,
    not the shipped component, but will look inconsistent in the `Maas`/`Lxd`
    stories until updated.
11. **`control` is a flat field on `LeafNavItem`, not a discriminated union.**
    `LeafNavItem` carries every field any of the three row variants might
    use (`url`, `onClick`, `checked`, `defaultChecked`, `onCheckedChange`)
    rather than three separate item shapes unioned on `control`. A
    discriminated union would let TypeScript forbid e.g. `url` alongside
    `control: "switch"` — this doesn't, and instead documents per-field which
    `control` value it's meaningful for. Chosen for authoring simplicity (one
    shape, matching every other tier in this model) over that extra type
    safety; revisit if the field carries more than three variants' worth of
    optional fields cleanly.
12. **`ContextSwitcher` reuses `SwitchInput` from `@canonical/react-ds-global-form`
    via a newly-curated top-level export**, extending the existing
    `RatingInput` precedent (a component the package already documents as
    usable standalone) rather than duplicating the switch's ~100 lines of
    track/knob CSS locally. `@canonical/react-ds-global-form`'s
    `package.json` also gained a proper `exports` map in the same pass — it
    had neither `main` nor `exports`, only the bundler-only `module` field,
    so nothing outside its own package (nor Node's own ESM resolver) could
    actually resolve it; this had simply never been exercised before ds-app
    became its first cross-package consumer.
13. `packages/react/ds-app/vitest.setup.ts`'s `ResizeObserver` mock was
    `vitest.fn().mockImplementation(arrowFn)` — arrow functions cannot be
    invoked with `new`, so any component constructing a real
    `new ResizeObserver(callback)` (as `Popover`'s window-fitment
    positioning does, via `ContextSwitcher`) threw `is not a constructor` in
    tests. Fixed to a plain class, matching `@canonical/react-ds-global`'s
    own working setup. Latent since ds-app had nothing exercising this path
    before.
14. **Collapsed-footer tooltips are deferred.** The spec calls for footer
    item labels to appear in a tooltip after an 800ms hover once collapsed
    (§7, distinct from the collapse button's own 1000ms tooltip, §9.4). The
    collapsed layout itself ships (icon-only footer rows, §2/§7), but wiring
    the tooltip requires threading a "collapsed" flag through
    `Footer` → `NavTree` → `renderEntry` → `Item`/`ItemButton` so each
    footer row can conditionally wrap itself — cross-cutting, unlike the
    collapse button's tooltip (self-contained in one component, shipped this
    PR). Tracked as a follow-up rather than rushed alongside the rest of
    PR6's collapsed-state mechanics.
15. **`brandHref`/`logo-target` is not implemented.** `brand` stays an
    opaque `ReactNode` — the consumer's own logo markup, including its own
    `<a href>` if it wants one; `SideNavigation` never wraps it in a link of
    its own. Implementing `logo-target` properly (default: the first
    navigable item under `root`) would mean `SideNavigation` owning that
    anchor instead, which changes what `brand` even is (content vs. a
    link's children) — a bigger change than any of AC1–AC4 calls for, so
    deferred rather than half-built.
16. **`createHelpItem` is a data-construction helper, not enforcement.**
    Nothing prevents a consumer from omitting the mandatory Help item from
    `root` entirely — the spec calls it mandatory in prose, not as a type
    constraint this file can express (an omission is not a distinguishable
    shape from a deliberately Help-less nav). The helper (§4.3-adjacent,
    `packages/react/ds-app/src/lib/SideNavigation/helpItem.ts`) only makes
    authoring it correctly (right icon, right external-link child, right
    field names) a one-line call instead of five.
17. **Truncated-text tooltips use the native `title` attribute, not the
    spec's custom 800ms-delay styled tooltip.** Every label (`Item`/
    `ItemButton`/`ItemSwitch`/`ItemExpandable`/`GroupHeader`/`Secondary`'s
    title) now sets `title` to its own text — a real, working fallback
    (the browser's own tooltip, on native hover timing) but not a
    pixel-accurate implementation of §7's spec. A precise version needs to
    detect *actual* truncation (`scrollWidth > clientWidth`, typically via a
    ResizeObserver-backed hook) and only then show the styled tooltip —
    unconditionally wrapping every label in `withTooltip` would show it even
    when the text isn't truncated at all. That detection hook doesn't exist
    yet in either `ds-app` or `ds-global`; building and testing it properly
    is a separable piece of work from the rest of PR8.
18. **The mobile (<768px) drill-down is out of scope.** SPEC.md §7
    describes expandable/secondary-opening items switching to a
    `chevron-right` affordance that navigates to a full-screen "page" of
    just that item's children, with a back button (`chevron-left`) to
    return. This needs its own navigation-stack state (which "page" — root,
    or a specific item's children — is currently shown) and a mobile-only
    rendering path for `ItemExpandable`, distinct from its desktop
    disclosure behaviour; it is a separate interaction mode, not a CSS
    variation of what PR8 already ships (Menu/Close-menu button, fullscreen
    reveal, header layout preserved on mobile). Tracked as a follow-up.
</content>
