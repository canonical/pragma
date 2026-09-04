# SideNavigation — Component Specification

> **Status:** Draft — rewritten against the 24.04 Side Navigation spec
> (Figma: [App Mafia exploration](https://www.figma.com/design/4BxGmZUlhgWChPWu4lGzZv/24.04-Side-Navigation-exploration---App-Mafia?node-id=656-31955),
> prose spec: *Side Navigation (App Layout)*). Anatomy, token pairings,
> properties, state/keyboard, accessibility, and responsive behaviour are all
> specified below; implementation lands across the PR sequence in
> [§8 Implementation status](#8-implementation-status).

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
| `brand` | `logo` | `ReactNode` | — | **Deviation** — spec is a closed 8-product single-select; kept as `ReactNode` for consumer flexibility (§10.5) |
| `brandHref` | `logo-target` | `string` | first navigable item under `root` | External URLs are rejected by the spec; validated as a same-app path |
| `applicationName` | — | `ReactNode` | — | Pre-existing, not in spec; kept |
| `root` | `content` | `NavItem` | — | WD405 root; direct children render as groups (§4.3) |
| `footerItems` | `footer-items` | `("account" \| "notifications" \| "logout")[]` | `[]` (footer hidden) | Closed vocabulary per spec — see §10.6 for the `footerRoot` escape hatch |
| `certificateUser` | *(implied by "certificate user" usage note)* | `boolean` | `false` | Swaps the account icon `user` → `certificate`; forces `logout` out of `footerItems` |
| `LinkComponent` | — | `ComponentType<LinkComponentProps> \| "a"` | `"a"` | Router integration, per `cs:react.component.link_component` |
| `currentUrl` | — | `string` | — | Drives `aria-current` + active state |
| `defaultExpanded` | `is-open` | `boolean` | `true` | Uncontrolled; the DS has no controlled variant (deferred — see the commented-out controlled circuit in `SideNavigation.tsx`) |
| `keyboardShortcut` | *(unratified — §10.1)* | `boolean` | **`false`** | Reserved. When `true`, binds the collapse shortcut in `COLLAPSE_SHORTCUT`. Ships disabled; no story enables it until design ratifies the key |

### 4.2 `SideNavigation.Secondary`

| Prop | Spec property | Type | Notes |
|---|---|---|---|
| `title` | `title` | `ReactNode` | Rendered in the header; also the `aria-label` |
| `root` | `content` | `NavItem` | Direct children render as groups; **items must not be `icon`- or `items`-bearing** — enforced by the narrower `SecondaryNavItem` type (icon and items omitted) |
| `onClose` | *(derived from "hides on primary click")* | `() => void` | Called when a primary item without a secondary target is activated |

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
  export const COLLAPSE_SHORTCUT = { ctrlOrMeta: true, key: "e" } as const;
  ```

  `SideNavigation` calls `useCollapseShortcut({ enabled: keyboardShortcut,
  onTrigger: handleToggle })`; `keyboardShortcut` defaults to `false`, so no
  listener attaches and no keydown is ever handled. The single named constant
  is the one place the key changes if/when design ratifies "Ctrl+E" vs. a
  single letter (§10.1). Tested for both: enabling attaches and fires the
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
| 1 | This spec + amended existing anatomy YAMLs | ✅ this PR |
| 2 | `<nav>` landmark + `ComponentProps`-based prop types (AC1) | pending |
| 3 | Provisional navigation tokens + full-spec styling (AC2) | pending |
| 4 | Group/GroupHeader/Separator/ItemExpandable, depth-1 type | pending |
| 5 | ItemButton/ItemSwitch/ContextSwitcher (AC3, AC4) | pending |
| 6 | Collapsed rail behaviour, tooltips, inert shortcut scaffold | pending |
| 7 | Secondary navigation, Help item, footerItems, certificate user | pending |
| 8 | Responsive (<768px), text-overflow tooltips, focus-order/reduced-motion tests | pending |

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
icon column (`--sidenav-start`, 0.75rem in the current implementation). If
design intends the *icon column* to be the collapsed-width reference instead
of the logo, this constant changes to reference `--sidenav-start`.

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

### 9.4 — Overflow gradient height: `1.75rem`

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
5. **`logo` is a closed 8-product single-select in the spec; the API is
   `brand: ReactNode`.** Kept as `ReactNode` — a closed enum would block any
   consumer outside the named 8 products and contradicts this being a
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
</content>
