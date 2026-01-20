# @canonical/ds-assets

Icons and shared visual assets for the Pragma design system.

## Installation

```bash
bun add @canonical/ds-assets
```

## Icons

The package provides over 150 SVG icons for interface actions, status indicators, navigation, and brand logos.

### TypeScript Usage

Import the type-safe constant and type:

```typescript
import { ICON_NAMES, type IconName } from "@canonical/ds-assets";

// Type-safe icon name
const iconName: IconName = "search";

// Validate user input
const isValidIcon = (name: string): name is IconName =>
  ICON_NAMES.includes(name as IconName);
```

### SVG Files

Raw SVG files live in the `icons/` directory. Each icon uses a 16x16 viewBox and `currentColor` fill, allowing icons to inherit text colour from their context.

Icons can be referenced directly via SVG's `<use>` element:

```html
<svg width="16" height="16">
  <use href="path/to/search.svg#search" />
</svg>
```

See [docs/ICONS.md](docs/ICONS.md) for the complete icon specification, naming conventions, and migration notes from Vanilla.
