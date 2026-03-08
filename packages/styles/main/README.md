# @canonical/styles

Global stylesheet for the Canonical Design System. Single import that aggregates normalize, typography, and design tokens into a layered cascade.

## Installation

```bash
bun add @canonical/styles
```

## Usage

Import once in your application entry point:

```css
@import url("@canonical/styles");
```

Or in JavaScript/TypeScript:

```ts
import "@canonical/styles";
```

This single import provides:

- **CSS reset** via [normalize.css](https://github.com/necolas/normalize.css)
- **Typography baseline grid** via `@canonical/styles-typography`
- **Design tokens** (colour, spacing, surfaces, states) via `@canonical/design-tokens`
- **`color-scheme: light dark`** on `:root` for `light-dark()` support

## Cascade Layers

The stylesheet establishes a deterministic layer order:

```css
@layer normalize, ds.reset, ds.modifiers, ds.components;
```

This ensures that component styles always override modifier styles, which always override resets, regardless of source order in consuming applications.

## Design Tokens

The following token sets from `@canonical/design-tokens` are included:

| Token Set | Contents |
|-----------|----------|
| `sets.primitive` | Base colour palette, spacing scale, font sizes |
| `modifiers.theme` | Light/dark theme mappings |
| `modifiers.surfaces` | Surface elevation tokens |
| `modifiers.anticipation` | Constructive/destructive/caution intents |
| `modifiers.criticality` | Error/warning/success/information states |
| `modifiers.emphasis` | Branded/highlighted/muted emphasis |
| `modifiers.importance` | Primary/secondary importance levels |
| `states` | Interactive state tokens (hover, active, focus, disabled) |

## Dependencies

| Package | Role |
|---------|------|
| `@canonical/design-tokens` | CSS custom properties for colour, spacing, and states |
| `@canonical/styles-typography` | Baseline grid engine and typographic scale |
| `normalize.css` | Cross-browser CSS reset |

## Package Structure

```
src/
  index.css   -- entry point, imports all dependencies
```
