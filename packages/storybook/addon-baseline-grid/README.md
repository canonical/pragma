# @canonical/storybook-addon-baseline-grid

Baseline grid overlay for Storybook. This addon helps verify typography alignment by displaying a configurable grid overlay on stories.

## Installation

```bash
bun add -D @canonical/storybook-addon-baseline-grid
```

## Setup

Register the addon in your `.storybook/main.ts`:

```typescript
const config: StorybookConfig = {
  addons: [
    "@canonical/storybook-addon-baseline-grid",
  ],
};

export default config;
```

## Usage

Press `g` while viewing any story to toggle the baseline grid overlay. The grid appears as horizontal lines that help verify text alignment across components.

The toolbar also includes a toggle button for the grid.

## Configuration

The grid appearance is controlled by CSS custom properties. Override the defaults in your preview styles:

```css
:root {
  --baseline-grid-color: rgba(255, 0, 0, 0.2);
  --baseline-height: 0.5rem;
}
```

**--baseline-grid-color** sets the line colour. The default red with 20% opacity is visible without being distracting. Adjust opacity or use a different colour to match your preferences.

**--baseline-height** sets the spacing between grid lines. This should match your typography baseline. The default 0.5rem (8px at default font size) aligns with common baseline grids.

## Why Use a Baseline Grid

Baseline grids ensure consistent vertical rhythm across a design. When text, images, and UI elements align to the same baseline, layouts feel more cohesive and easier to scan.

The overlay helps catch alignment issues during development. Components that break the baseline become immediately visible when the grid is enabled.

## Requirements

This addon uses ES modules and requires Node 20 or later.
