# @canonical/react-tokens

Token explorer components for the Pragma design system. This package provides `TokenTable` and `TokenSwatch` — reusable visualization components for browsing, comparing, and understanding the design token system inside Storybook.

## Prerequisites

- React 19 or higher
- `@canonical/styles` for global design tokens (the token CSS custom properties that swatches reference)

## Installation

```bash
bun add @canonical/react-tokens
```

## Usage

Import the components and pass token data:

```tsx
import { TokenTable, type TokenEntry } from "@canonical/react-tokens";

const tokens: TokenEntry[] = [
  {
    cssVar: "--color-text",
    id: "color.text",
    type: "color",
    tier: "semantic",
    stability: "wip",
    cssOutputFile: "modifiers.theme.css",
    isPaired: true,
    valueLight: "oklch(12.2% 0 0)",
    valueDark: "oklch(93.5% 0 0)",
  },
];

function TokenReference() {
  return (
    <TokenTable
      tokens={tokens}
      title="Semantic colors"
      columns={["token", "swatch", "light", "dark", "stability"]}
      searchable
      groupBy="prefix"
    />
  );
}
```

Color swatches render live `var()` references, so they update automatically when the Storybook theme switches between light and dark modes.

## Components

### TokenTable

A dense, scannable table for browsing design tokens. Supports search, grouping, column selection, and auto-detected column layouts.

```tsx
import { TokenTable } from "@canonical/react-tokens";
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tokens` | `TokenEntry[]` | — | **Required.** Token data to display. |
| `title` | `string` | — | Title shown above the table. |
| `caption` | `string` | — | Supporting copy shown below the title. |
| `columns` | `TokenColumnId[]` | Auto-detected | Which columns to render. When omitted, columns are inferred from the token data shape. |
| `searchable` | `boolean` | `false` | Show a search input that filters across all token metadata. |
| `showCount` | `boolean` | `true` | Show the filtered token count in the toolbar. |
| `dense` | `boolean` | `true` | Use compact padding optimized for scanning. |
| `groupBy` | `TokenGroupBy` | — | Group tokens under inline section headers. |
| `searchPlaceholder` | `string` | `"Search tokens, ids, or files…"` | Placeholder text for the search input. |
| `emptyMessage` | `string` | `"No tokens match the current filters."` | Text shown when no tokens pass the filter. |
| `className` | `string` | — | Additional CSS class on the root element. |

#### Column identifiers

| Column | Content |
|--------|---------|
| `token` | CSS variable name with inline metadata (DTCG ID, type, tier, output file). |
| `swatch` | Visual preview rendered by `TokenSwatch`. |
| `light` | Light-mode resolved value. |
| `dark` | Dark-mode resolved value. |
| `value` | Single resolved value (for unpaired tokens). |
| `type` | DTCG token type. |
| `tier` | Token tier (primitive, semantic, derived). |
| `stability` | Maturity badge (stable, WIP, experimental). |
| `derivedFrom` | Parent token CSS variable name. |
| `derivation` | Derivation mechanism (hover, active, channel-modifier, etc.). |

#### Column auto-detection

When `columns` is omitted, TokenTable infers a layout:

- Tokens with `isPaired: true` → `token, swatch, light, dark, stability`
- Tokens with `derivedFrom` and no values → `token, swatch, derivedFrom, derivation, stability`
- Tokens with a single value → `token, swatch, value, stability`

#### Grouping modes

| Mode | Groups by | Use when |
|------|-----------|----------|
| `type` | DTCG token type | Checking rendering and CSS assignability semantics. |
| `tier` | Token tier | Deciding what to consume vs. what is infrastructure. |
| `cssOutputFile` | Generated CSS file | Validating build output and cascade layers. |
| `derivation` | Derivation mechanism | Debugging modifier, surface, and state relationships. |
| `prefix` | Semantic family (text, border, icon, foreground) | Finding all tokens in a domain. |

### TokenSwatch

A compact visual preview for a single token. Renders type-specific representations: color patches, dimension bars, font samples, curve indicators, gradient strips, border/shadow/stroke previews, and derivation references.

```tsx
import { TokenSwatch } from "@canonical/react-tokens";
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `token` | `TokenEntry` | — | **Required.** The token to visualize. |
| `contextClass` | `string` | — | CSS class for modifier context (e.g., `"error"`). Reserved for Phase 2. |
| `className` | `string` | — | Additional CSS class on the root element. |

`TokenSwatch` also accepts all standard `HTMLDivElement` attributes via prop spreading.

#### Rendering by type

| Token type | Rendering |
|------------|-----------|
| `color` | 2rem × 2rem filled square using `var(--token-css-var)`. Shows L/D chip when paired. |
| `dimension` | Horizontal bar scaled to `min(var(--token), 8rem)` with value label. |
| `number` | Numeric chip (Δ prefix for delta tokens) with formatted value. |
| `fontFamily` | "Ag" sample text in the referenced font family. |
| `fontWeight` | "Ag" sample text at the referenced weight. |
| `typography` | "Aa Bb 123" sample inheriting semantic text color. |
| `duration` | `ms` chip with duration value. |
| `cubicBezier` | Curve indicator with truncated function value. |
| `gradient` | Mini gradient strip using `var(--token)`. |
| `border` | Mini box with the token applied as `border`. |
| `shadow` | Mini box with the token applied as `box-shadow`. |
| `transition` | Arrow indicator (↔) with truncated transition shorthand. |
| `strokeStyle` | 2px line with the token applied as `border-top-style`. |
| Derived (no value) | Arrow → parent token name + derivation badge. |

## Data model

### TokenEntry

The core data structure representing a single design token.

```typescript
interface TokenEntry {
  // Identification
  cssVar: string;             // "--color-background"
  id: string | null;          // "color.background" (DTCG ID)
  description?: string;       // Human-readable description
  aliasChain?: string[];      // Full alias resolution chain

  // Classification
  type: TokenType;            // "color" | "dimension" | ... (13 DTCG types)
  tier: TokenTier;            // "primitive" | "semantic" | "derived"
  stability: Stability;       // "stable" | "wip" | "experimental"

  // CSS output
  cssOutputFile: string;      // "modifiers.theme.css"
  cssSelector?: string;       // ".surface" (where token is declared)
  cssType?: string;           // "<color>" (CSS syntax descriptor)

  // Values
  isPaired: boolean;          // true if light ≠ dark
  valueLight?: string;        // "oklch(100% 0 0)"
  valueDark?: string;         // "oklch(12.21% 0 0)"
  hexLight?: string;          // "#ffffff"
  hexDark?: string;           // "#1f1f1f"

  // Derivation
  derivedFrom?: string;       // "--color-foreground-primary"
  derivation?: Derivation;    // "hover" | "active" | "channel-modifier" | ...

  // @property registration
  registered?: boolean;
  syntax?: string | null;
  inherits?: boolean | null;
  initialValue?: string | null;
}
```

### Token types (DTCG-aligned)

`color`, `dimension`, `number`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `gradient`, `border`, `shadow`, `typography`, `transition`, `strokeStyle`

### Token tiers

| Tier | Role | Consumption rule |
|------|------|-----------------|
| **Primitive** | Raw values (palette colors, spacing units) | Never reference directly in component styles. |
| **Semantic** | Intent-bearing tokens (color-text, color-background) | The component-facing API. Use these. |
| **Derived** | Modifier channels, surface channels, interaction states | Resolved through fallback chains. Infrastructure. |

### Stability levels

| Level | Meaning | Guidance |
|-------|---------|----------|
| **Stable** | Locked for production. | Safe to depend on. |
| **WIP** | May change; codemods will be provided. | Use with awareness that names or values may shift. |
| **Experimental** | Under active design; expect breaking changes. | Internal use only. |

## Styles

TokenTable and TokenSwatch co-locate their CSS under `.ds.token-table` and `.ds.token-swatch` namespaces. Styles use the `color-mix(in srgb, currentColor X%, transparent)` pattern for adaptive borders and backgrounds, so the components work correctly in both light and dark Storybook themes without additional configuration.

Import the global styles package in your Storybook preview to make token CSS custom properties available:

```css
@import "@canonical/styles";
```

## Storybook

The package includes reference stories and page-level documentation stories:

```bash
cd packages/react/tokens
bun run storybook
```

### Story structure

| Story | Diataxis quadrant | Content |
|-------|-------------------|---------|
| `Foundations/Tokens/Internal/TokenTable` | Reference | Component API demonstration with default and grouped variants. |
| `Foundations/Tokens/Internal/TokenSwatch` | Reference | Individual swatch rendering for color and derived tokens. |
| `Foundation/Design Tokens — Overview` | Explanation | Token architecture summary, tier hierarchy, rules of thumb. |
| `Foundation/Design Tokens — Explorer` | Reference | Dense token catalog with all grouping lenses. |
| `Foundation/Design Tokens — Patterns` | Explanation | Live modifier, surface, and interaction state demonstrations. |
| `Foundation/Design Tokens — Consumer Guidance` | How-to | Do/don't guidance, code patterns, change management. |

## Token landscape

The design token system currently comprises 730 tokens across 7 CSS output files:

| Output file | Token count | Content |
|-------------|-------------|---------|
| `sets.primitive.css` | 202 | Palette colors, spacing dimensions. |
| `modifiers.theme.css` | 332 | Semantic colors (light/dark paired). |
| `modifiers.typography.css` | 143 | Font families, weights, and typographic scales. |
| `states.css` | 30 | Hover, active, disabled interaction states. |
| `modifiers.surfaces.css` | 15 | Surface depth channels. |
| `modifiers.emphasis.css` | 6 | Emphasis modifier channels. |
| `modifiers.criticality.css` | 2 | Criticality modifier channels. |

By DTCG type: 488 color, 135 typography, 79 dimension, 16 number, 8 fontWeight, 4 fontFamily.

## Exported constants

```typescript
import {
  DTCG_TOKEN_TYPES,           // All 13 DTCG type strings
  DTCG_TOKEN_TYPE_LABELS,     // Human-readable labels per type
  DTCG_TOKEN_TYPE_TO_CSS,     // DTCG type → CSS syntax descriptor
  TOKEN_LENS_DESCRIPTIONS,    // Titles and rationale for each grouping lens
  mockTokens,                 // 45 curated tokens for development and testing
} from "@canonical/react-tokens";
```

## Component specifications

Token visualization components are specified by the design-system ontology. See `specs/` for the token vocabulary extension and SHACL validation shapes that align the TypeScript `TokenEntry` interface with the `ds:Token` class.
