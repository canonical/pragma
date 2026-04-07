# ADR: Floating Component Architecture

- **Status:** Accepted
- **Date:** 2026-04-07
- **Authors:** Maria Dias
- **Scope:** `@canonical/react-ds-global` — Tooltip, Popover, DropdownButton, ContextualMenu

---

## Context

The design system requires a family of components that display floating content anchored to a trigger element: **Tooltip** (hover-triggered informational text), **Popover** (click-triggered dialog panel), **DropdownButton** (button with a dropdown option list), and **ContextualMenu** (trigger with a floating menu of actions).

These components share significant behavioral overlap:

- Positioning floating content relative to a target element
- Portalling the floating element to avoid overflow clipping
- Viewport-aware repositioning (auto-fit, preferred directions)
- Open/close state management with delays
- Keyboard dismissal (Escape)
- Appropriate ARIA relationships between trigger and floating content

Before this decision, only `Tooltip` and `TooltipArea` existed. `TooltipArea` implemented all of the above concerns directly, tightly coupling generic floating behavior to tooltip-specific rendering (arrow CSS variables, `role="tooltip"`, `aria-describedby`). Adding Popover or DropdownButton would have required duplicating that logic.

## Decision

Introduce a **three-layer architecture** that separates positioning, interaction, and presentation:

```
┌─────────────────────────────────────────────────────┐
│                      Hooks                          │
│  useDelayedToggle → useWindowFitment → usePopup     │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │     FloatingAnchor      │   generic primitive
          │  (anchor + portal +     │
          │   positioning + a11y)   │
          └───┬─────────────────┬───┘
              │                 │
     ┌────────▼────────┐  ┌─────▼───────────┐
     │   TooltipArea   │  │    Popover      │   thin composing wrappers
     │ hover trigger   │  │  click trigger  │
     │ aria-describedby│  │  aria-controls  │
     │ role="tooltip"  │  │  role="dialog"  │
     └─────────────────┘  └──┬──────────┬───┘
                             │          │
                   ┌─────────▼────┐  ┌───▼───────────┐
                   │DropdownButton│  │ContextualMenu │  composed components
                   └──────────────┘  └───────────────┘
```

### Layer 1 — Hooks (positioning + state)

| Hook | Responsibility |
|---|---|
| `useWindowFitment` | Calculates optimal position for a floating element relative to a target within viewport bounds. Supports preferred directions, auto-fit, gutter, and distance. |
| `useDelayedToggle` | Manages a boolean flag with configurable activate/deactivate delays. |
| `usePopup` | Composes the above two hooks with trigger interaction handlers (hover, click), Escape dismissal, and click-outside-to-close. Exposes refs, state, and event handlers. |

`usePopup` was extended with a `trigger` option:
- `"hover"` (default) — opens on pointer-enter / focus, closes on pointer-leave / blur.
- `"click"` — toggles on click, closes on click-outside or Escape.

This is a backward-compatible addition; the existing `"hover"` behavior remains the default.

### Layer 2 — FloatingAnchor (generic primitive)

`FloatingAnchor` is a component that:

1. Wraps the anchor/target in a positioned `<span>` with a ref for measurement.
2. Calls `usePopup` to manage open/close state, positioning, and event wiring.
3. Renders the floating content in a React portal (SSR-safe).
4. Binds trigger events (hover or click) to the wrapper element.
5. Sets ARIA attributes on the anchor based on `ariaRelationship`:
   - `"describedby"` — `aria-describedby` on the target (for tooltips).
   - `"controls"` — `aria-controls` + `aria-expanded` on the target (for popovers / menus).
   - `"none"` — no automatic ARIA binding.

Floating content is specified via either:
- `content` prop — renders inside a default `<div>` wrapper with visibility handling.
- `renderContent` render prop — gives consumers full control over the floating element's markup, receiving `{ ref, id, isOpen, style, bestPosition, onPointerEnter, onFocus }`.

### Layer 3 — Consumer components

Each consumer component is a thin wrapper that composes `FloatingAnchor` with fixed defaults and its own presentational shell:

| Component | Trigger | ARIA | Floating content |
|---|---|---|---|
| **TooltipArea** | `hover` | `describedby` | `<Tooltip>` with arrow positioning CSS vars, `role="tooltip"` |
| **Popover** | `click` | `controls` | `<div role="dialog">` panel |
| **DropdownButton** | `click` | `controls` | `Popover` wrapping an option list |
| **ContextualMenu** | `click` | `controls` | `Popover` wrapping focusable menu items |

Consumer components use the `renderContent` render prop to control the floating panel's markup while delegating all positioning, portalling, and interaction to `FloatingAnchor`.

## Consequences

### Benefits

- **No duplication.** Positioning, portalling, viewport fitting, open/close state, Escape handling, and click-outside detection are implemented once in `usePopup` + `FloatingAnchor`.
- **Consistent interaction patterns.** All floating components share the same keyboard, pointer, and focus behavior.
- **Composable.** New floating components (e.g. ColorPicker dropdown, Autocomplete) only need to wrap `FloatingAnchor` or `Popover` with their own content — no new positioning logic needed.
- **Backward-compatible.** `TooltipArea` was refactored to compose `FloatingAnchor` internally with no public API changes. All existing tests pass without modification.
- **SSR-safe.** Portal rendering is gated behind `typeof window !== "undefined"` checks. SSR tests verify hydration safety for all components.
- **Accessible by default.** ARIA relationships, `role` attributes, and keyboard interactions are handled at the architecture level rather than left to each consumer.

### Trade-offs

- **Extra wrapper element.** `FloatingAnchor` adds a `<span>` wrapper around the anchor, which is inherited by all consumers. This is the same pattern `TooltipArea` already used, so it is not a regression.
- **Render prop complexity.** The `renderContent` API is more verbose than a simple `children` pattern, but it is necessary to give consumers full control over the floating panel's markup and ARIA attributes.
- **`usePopup` trigger modes.** Adding `"click"` trigger support increases the hook's surface area. This is kept manageable by branching at the event-handler level rather than splitting into separate hooks.

### What this does NOT cover

- **Focus trapping** inside popovers and menus. `ContextualMenu` will need focus-trap behavior (Tab cycles within the floating content). This should be implemented as a dedicated hook or utility composed alongside `FloatingAnchor`, not baked into the anchor primitive itself.
- **Animation.** Open/close transitions are not part of this architecture. CSS transitions on `opacity` and `visibility` are applied per-component via their own stylesheets.
- **Nested floating content.** Popovers within popovers or tooltips within popovers are not explicitly handled. The portal-based approach naturally supports this, but click-outside detection may need refinement for nested scenarios.

## Components overview

### FloatingAnchor

```tsx
<FloatingAnchor
  trigger="click"
  ariaRelationship="controls"
  distance="6px"
  preferredDirections={["bottom"]}
  renderContent={({ ref, id, isOpen, style }) => (
    <div ref={ref} id={id} role="dialog" style={style}>
      Custom floating content
    </div>
  )}
>
  <button>Click me</button>
</FloatingAnchor>
```

### Popover

```tsx
<Popover content="Panel content" preferredDirections={["bottom"]}>
  <Button>Open popover</Button>
</Popover>
```

### TooltipArea (refactored, unchanged public API)

```tsx
<TooltipArea Message="Helpful hint">
  <Button>Hover me</Button>
</TooltipArea>
```

### DropdownButton (composes Popover)

```tsx
<DropdownButon options={[{ label: "Option A", value: "a" }]}>
  Select
</DropdownButton>
```

### ContextualMenu (composes Popover)

```tsx
<ContextualMenu items={[{ label: "Edit" }, { label: "Delete" }]}>
  <IconButton icon="more" />
</ContextualMenu>
```

## File structure

```
hooks/
├── usePopup/           # trigger modes: "hover" | "click", Escape, click-outside
├── useWindowFitment/   # viewport-aware positioning
├── useDelayedToggle/   # delayed boolean toggle
├── useResizeObserver/
└── useWindowDimensions/

FloatingAnchor/
├── FloatingAnchor.tsx  # generic primitive
├── types.ts            # FloatingAnchorProps, FloatingAnchorRenderContentProps
├── styles.css
├── index.ts
├── FloatingAnchor.stories.tsx
├── FloatingAnchor.tests.tsx
└── FloatingAnchor.ssr.tests.tsx

Tooltip/
├── Tooltip.tsx         # presentational shell (role="tooltip")
├── common/
│   └── TooltipArea/    # composes FloatingAnchor (trigger="hover")
└── withTooltip.tsx     # HOC convenience wrapper

Popover/
├── Popover.tsx         # composes FloatingAnchor (trigger="click", role="dialog")
├── types.ts
├── styles.css
└── ...

DropdownButton/         # composes Popover
├── DropdownButton.tsx
└── ...

ContextualMenu/         # composes Popover (to be created)
├── ContextualMenu.tsx
└── ...
```
