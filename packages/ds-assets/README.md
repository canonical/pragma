# @canonical/ds-assets

Icons and shared visual assets for the Pragma design system.

## Installation

```bash
bun add @canonical/ds-assets
```

## Icons

The package provides over 150 SVG icons covering common interface actions, status indicators, navigation elements, and brand logos. All icons use a consistent 16x16 viewBox and `currentColor` for fill, allowing them to inherit text colour from their context.

### Available Icons

Icons are organized by category:

**Navigation**: arrow-up, arrow-down, arrow-left, arrow-right, chevron-up, chevron-down, chevron-left, chevron-right, back-to-top, home, menu, external-link

**Actions**: add-canvas, copy, delete, download, edit, export, filter, import, pin, search, select, share, upload

**Status**: error, error-fill, information, success, success-fill, warning, warning-fill, in-progress, queued, waiting

**Media Controls**: pause, play, play-fill, stop, fullscreen

**User Interface**: close, help, hide, show, locked, unlocked, notifications, notifications-off, settings

**Social**: facebook, github, instagram, linkedin, x, youtube, rss

See the `icons/` directory for the complete list.

### Using Icons

Import icon names as a type-safe constant:

```typescript
import { ICON_NAMES, type IconName } from "@canonical/ds-assets";

// Type-safe icon name
const iconName: IconName = "search";

// Validate user input
const isValidIcon = (name: string): name is IconName =>
  ICON_NAMES.includes(name as IconName);
```

The raw SVG files live in the `icons/` directory and can be imported directly or referenced by URL depending on your build setup.

### Icon Guidelines

Icons should be used at their native 16x16 size or scaled proportionally. The `currentColor` fill means icons automatically match surrounding text colour. To change icon colour, set the CSS `color` property on the icon or a parent element.

For accessibility, icons that convey meaning should include appropriate ARIA attributes. Decorative icons should use `aria-hidden="true"`.
