# Platform-Aware Key Rendering — Considerations

## Current State

Only navigation and enter keys render as symbols (↵ ↑ ↓ ← →). All other special keys use text labels (Tab, Shift, Ctrl, etc.). This is intentional: text labels are unambiguous and accessible by default, while symbols require `aria-label` overrides and carry a risk of inconsistent recognition across platforms and locales.

## Accessibility

Keys rendered as symbols (Unicode arrows, ⌘, ⌃, ⌥, etc.) are announced inconsistently by screen readers. Each symbol-mapped key needs a corresponding `aria-label` entry so the accessible name always reads as a recognisable word (e.g. "Enter" instead of "downwards arrow with corner leftwards").

The current implementation already handles this for the five symbol keys via the `ARIA_LABELS` constant.

## Platform-Specific Labels

Modifier keys differ visually across operating systems:

| `keyValue` | macOS | Windows / Linux |
|------------|-------|-----------------|
| `cmd`      | ⌘     | Ctrl            |
| `ctrl`     | ⌃     | Ctrl            |
| `alt`      | ⌥     | Alt             |
| `option`   | ⌥     | Alt             |
| `meta`     | ⌘     | ⊞ Win           |

## SSR Constraint

`navigator` does not exist on the server. Detecting the platform at the component level via `navigator.userAgent` would cause a hydration mismatch: the server renders a default, the client renders a platform-specific label, and React flags the difference.

### Ideal Solution — Context-Based Platform

Platform should be a value on the design system provider context, set once at the app root:

```tsx
<DSProvider platform="mac">
  <App />
</DSProvider>
```

- The server receives the platform from the request's `User-Agent` header and passes it down — no browser API sniffing, fully deterministic on both sides.
- The component reads from context, not the environment: `useDSContext().platform`.
- The first render on server and client produces identical output.
- When no provider exists, the component falls back to `KEY_LABELS` (universal text labels).

This is the same pattern used by i18n (locale), theming (color scheme), and directionality (RTL) — all for the same reason: the environment is known at the app boundary, not at the leaf component.

## Storybook

A `platform` decorator can follow the same convention as the existing `rtl` decorator:

```tsx
export const platform = (value: "mac" | "other") => (Story: ElementType) => (
  <DSProvider platform={value}>
    <Story />
  </DSProvider>
);
```

This lets both platform variants be previewed side by side without needing an actual macOS or Windows environment.

## Sequencing

1. Add `platform` to the DS provider context (separate PR).
2. Wire `KeyboardKey` to consume platform context and resolve labels accordingly.
3. Expand `ARIA_LABELS` for any new symbol entries (⌘, ⌃, ⌥, ⊞).
4. Add the `platform()` Storybook decorator.
