# @canonical/storybook-addon-utils

Debug and layout utilities for Storybook. Adds toolbar controls for grid wrapping, color scheme, baseline grid overlay, and element outlines.

## Installation

```bash
bun add -D @canonical/storybook-addon-utils
```

## Setup

Register the addon in your `.storybook/main.ts`:

```typescript
const config: StorybookConfig = {
  addons: [
    "@canonical/storybook-addon-utils",
  ],
};

export default config;
```

## Toolbar Controls

| Control | Shortcut | Values | Description |
|---|---|---|---|
| Grid mode | `G` | none → intrinsic → responsive | Wraps story in a `.grid` container |
| Color scheme | `S` | none (system) → light → dark | Toggles `.light`/`.dark` class on body |
| Baseline grid | `B` | on/off | Shows baseline grid overlay |
| Outlines | `O` | on/off | Shows element outline overlay |

## Story Parameters

Stories and metas can set default values via `parameters`. Toolbar overrides always take precedence.

```tsx
const meta = {
  parameters: {
    grid: "intrinsic",        // "none" | "intrinsic" | "responsive"
    scheme: "none",           // "none" | "light" | "dark"
    debug: {
      baseline: true,         // boolean
      outlines: false,        // boolean
    },
  },
} satisfies Meta;

// Story-level override
export const DarkMode: Story = {
  parameters: {
    scheme: "dark",
  },
};
```

## CSS Custom Properties

Override these in your preview styles to customise the overlays:

| Property | Default | Description |
|---|---|---|
| `--baseline-grid-color` | `rgba(255, 0, 0, 0.2)` | Baseline grid line colour |
| `--baseline-height` | `0.5rem` | Baseline grid spacing |
| `--debug-outline-color` | `light-dark(rgba(0,128,80,0.25), rgba(80,220,140,0.25))` | Element outline colour |

## Requirements

ES modules. Node 20+. Storybook 10.3+.
