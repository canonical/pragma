# Track A2 — Implement the base components

Replace the components in your application that pragma provides in the global tier (except form components — that's [Track A3](./TRACK_A3_FORM_COMPONENTS.md)) so that, for the covered set, nothing is imported from Vanilla, `@canonical/react-components`, or home-grown equivalents any more.

| | |
|---|---|
| **Track** | A2 (family A) |
| **Difficulty** | Low |
| **Estimated time** | Depends on how many covered components your app uses; each swap is mechanical |
| **Prerequisites** | [Track A1](./TRACK_A1_STYLES_TOKENS_ASSETS.md) completed — components resolve tokens and icons through it |

## Who this is for

Engineers on a team adopting pragma for 26.10, after finishing Track A1.

## What "done" means

- [ ] For every component in the covered set below, your application imports the pragma version — no equivalent remains from `@canonical/react-components`, vanilla-framework markup, or your own codebase.
- [ ] Replaced screens pass your visual review and basic keyboard navigation.

Components pragma does **not** yet provide are out of scope: keep your current implementation and do not block on this track.

## The covered set

As of `@canonical/react-ds-global` 0.30.0, the global tier exports these components:

<!-- adoption:covered-set:begin package=@canonical/react-ds-global -->

| Components | | |
|---|---|---|
| Accordion | Announcement | Badge |
| Breadcrumbs | Button | Card |
| Chip | ContextualMenu | Icon |
| InlineCode | KeyboardKey | Popover |
| Tabs | Tile | Tooltip |

Plus `Spinner` from the subcomponent tier.

<!-- adoption:covered-set:end -->

The package also exports a work-in-progress tier (components not yet promoted to a stable tier). WIP components are **not** part of the covered set — adopt them only by explicit agreement with the pragma team.

## The path

### 1. Install the package

```bash
bun add @canonical/react-ds-global
# or: npm install @canonical/react-ds-global
```

### 2. Inventory what you use

List your imports from the old sources and intersect them with the covered set:

```bash
grep -rEn "from ['\"]@canonical/react-components['\"]" src/
```

Also look for home-grown versions of covered components (your own `Button.tsx`, tooltip wrappers, and so on) and vanilla-framework class-based markup.

### 3. Replace one component type at a time

Work through your inventory component by component — one small PR per component type is easier to review and to bisect if something regresses.

```tsx
import { Accordion, Button } from "@canonical/react-ds-global";
```

Be mindful that names and boundaries changed relative to Vanilla: some components were renamed, and some Vanilla components are split into several pragma components (for example, `Card` and `Tile` are distinct components in pragma). Check each component's props in its Storybook stories or type definitions before swapping — do not assume prop-for-prop compatibility.

To browse the components, run the package's Storybook from a pragma checkout ([repository quick start](../../../README.md#quick-start)):

```bash
cd packages/react/ds-global && bun run storybook
```

### 4. Mind the icons

Icon-bearing components (`Icon`, `Spinner`, the `Accordion` caret) render empty if `/icons` is not served — that is a Track A1 gap, not a component bug. See [Track A1, step 3](./TRACK_A1_STYLES_TOKENS_ASSETS.md#3-serve-the-icons-at-icons).

### 5. Accessibility is part of the contract

Pragma components ship their accessibility behaviour as part of the API — for example, icon-only `Button`s warn unless you pass an explicit `aria-label`. Fix these warnings during the swap rather than suppressing them.

## Verify

1. The inventory grep from step 2 returns no remaining old-source imports for covered components.
2. Replaced screens render correctly and are keyboard-operable.
3. Your visual regression suite (or a manual sweep) passes.

## If you get stuck

File an issue at [canonical/pragma/issues](https://github.com/canonical/pragma/issues). If a covered component is missing a capability you need, say so in the issue — capability gaps found during adoption are prioritised.

## Next

[Track A3 — implement the form components](./TRACK_A3_FORM_COMPONENTS.md).
